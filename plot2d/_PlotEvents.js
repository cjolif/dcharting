define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/connect"],
	function(lang, declare, hub){

	return declare(null, {
		constructor: function(){
			this._shapeEvents = [];
		},
		destroy: function(){
			// summary:
			//		Destroy any internal elements and event handlers.
			this.resetEvents();
			this.inherited(arguments);
		},
		plotEvent: function(o){
			// summary:
			//		Stub function for use by specific plots.
			// o: Object
			//		An object intended to represent event parameters.
		},
		raiseEvent: function(o){
			// summary:
			//		Raises events in predefined order
			// o: Object
			//		An object intended to represent event parameters.
			this.plotEvent(o);
			var t = lang.delegate(o);
			t.originalEvent = o.type;
			t.originalPlot  = o.plot;
			t.type = "onindirect";
			if(this.chart.stack){
				this.chart.stack.forEach(function(plot){
					if(plot !== this && plot.plotEvent){
						t.plot = plot;
						plot.plotEvent(t);
					}
				}, this);
			}
		},
		connect: function(object, method){
			// summary:
			//		Helper function to connect any object's method to our plotEvent.
			// object: Object
			//		The object to connect to.
			// method: String|Function
			//		The method to fire when our plotEvent is fired.
			// returns: Array
			//		The handle as returned from dojo.connect (see dojo.connect).
			this.dirty = true;
			return hub.connect(this, "plotEvent", object, method);	//	Array
		},
		events: function(){
			// summary:
			//		Find out if any event handlers have been connected to our plotEvent.
			// returns: Boolean
			//		A flag indicating that there are handlers attached.
			return !!this.plotEvent.after;
		},
		resetEvents: function(){
			// summary:
			//		Reset all events attached to our plotEvent (i.e. disconnect).
			if(this._shapeEvents.length){
				this._shapeEvents.forEach(function(item){
					item.shape.disconnect(item.handle);
				});
				this._shapeEvents = [];
			}
			this.raiseEvent({type: "onplotreset", plot: this});
		},
		_connectSingleEvent: function(o, eventName){
			this._shapeEvents.push({
				shape:  o.eventMask,
				handle: o.eventMask.connect(eventName, this, function(e){
					o.type  = eventName;
					o.event = e;
					this.raiseEvent(o);
					o.event = null;
				})
			});
		},
		_connectEvents: function(o){
			if(o){
				o.chart = this.chart;
				o.plot  = this;
				o.hAxis = this.hAxis || null;
				o.vAxis = this.vAxis || null;
				o.eventMask = o.eventMask || o.shape;
				this._connectSingleEvent(o, "onmouseover");
				this._connectSingleEvent(o, "onmouseout");
				this._connectSingleEvent(o, "onclick");
			}
		},
		_reconnectEvents: function(series){
			var a = series._eventSeries;
			if(a){
				a.forEach(this._connectEvents, this);
			}
		},
		_assignEvents: function(series, eventSeries){
			return series._eventSeries = eventSeries;
		},
		fireEvent: function(series, eventName, index, eventObject){
			// summary:ru
			//		Emulates firing an event for a given data value (specified by
			//		an index) of a given series.
			// series: Series
			//		Targeted Series.
			// eventName: String
			//		Event name to emulate.
			// index: Number
			//		Valid data value index used to raise an event.
			// eventObject: Object?
			//		Optional event object. Especially useful for synthetic events.
			//		Default: null.
			var s = series._eventSeries;
			if(s && s.length && index < s.length){
				var o = s[index];
				o.type  = eventName;
				o.event = eventObject || null;
				this.raiseEvent(o);
				o.event = null;
			}
		}
	});
});
