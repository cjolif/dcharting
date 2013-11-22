define(["dojo/_base/declare", "dojo/_base/window", "dojo/_base/array", "dojo/_base/event",
	"dojo/_base/connect", "dojo/mouse", "./ChartAction", "dojo/sniff", "dojo/dom-prop", "dojo/keys",
	"dojo/has!dojo-bidi?../bidi/action2d/ZoomAndPan"],
	function(declare, win, arr, eventUtil, connect, mouse, ChartAction, has, domProp, keys, BidiMouseZoomAndPan){

	var sUnit = has("mozilla") ? 3 : 120;
	var keyTests = {
		none: function(event){
			return !event.ctrlKey && !event.altKey && !event.shiftKey;
		},
		ctrl: function(event){
			return event.ctrlKey && !event.altKey && !event.shiftKey;
		},
		alt: function(event){
			return !event.ctrlKey && event.altKey && !event.shiftKey;
		},
		shift: function(event){
			return !event.ctrlKey && !event.altKey && event.shiftKey;
		}
	};

	var MouseZoomAndPan = declare(ChartAction, {
		// summary:
		//		Create an mouse zoom and pan action.
		//		You can zoom in or out the data window with mouse wheel. You can scroll using mouse drag gesture. 
		//		You can toggle between zoom and fit view using double click on the chart.

		// axis: String?
		//		Target axis name for this action.  Default is "x".
		axis: "x",
		// scaleFactor: Number?
		//		The scale factor applied on mouse wheel zoom.  Default is 1.2.
		scaleFactor: 1.2,
		// maxScale: Number?
		//		The max scale factor accepted by this chart action.  Default is 100.
		maxScale: 100,
		// enableScroll: Boolean?
		//		Whether mouse drag gesture should scroll the chart.  Default is true.
		enableScroll: true,
		// enableDoubleClickZoom: Boolean?
		//		Whether a double click gesture should toggle between fit and zoom on the chart.  Default is true.
		enableDoubleClickZoom: true,
		// enableKeyZoom: Boolean?
		//		Whether a keyZoomModifier + + or keyZoomModifier + - key press should zoom in our out on the chart.  Default is true.
		enableKeyZoom: true,
		// keyZoomModifier: String?
		//		Which keyboard modifier should used for keyboard zoom in and out. This should be one of "alt", "ctrl", "shift" or "none" for no m
		keyZoomModifier: "ctrl",

		constructor: function(chart, plot, params){
			// summary:
			//		Create an mouse zoom and pan action and connect it.
			// chart: dcharting/Chart
			//		The chart this action applies to.
			// params: Object|null
			//		Hash of initialization parameters for the action.
			//		The hash can contain any of the action's properties, excluding read-only properties.
			this._listeners = [{eventName: mouse.wheel, methodName: "onMouseWheel"}];
			if(this.enableScroll){
				this._listeners.push({eventName: "onmousedown", methodName: "onMouseDown"});
			}
			if(this.enableDoubleClickZoom){
				this._listeners.push({eventName: "ondblclick", methodName: "onDoubleClick"});
			}
			if(this.enableKeyZoom){
				this._listeners.push({eventName: "keypress", methodName: "onKeyPress"});				
			}
			this._handles = [];
			this.connect();
		},
		
		_disconnectHandles: function(){
			if(has("ie")){
				this.chart.domNode.releaseCapture();
			}
			arr.forEach(this._handles, connect.disconnect);
			this._handles = [];
		},
		
		connect: function(){
			// summary:
			//		Connect this action to the chart.
			this.inherited(arguments);
			if(this.enableKeyZoom){
				// we want to be able to get focus to receive key events 
				domProp.set(this.chart.domNode, "tabindex", "0");
				// if one doesn't want a focus border he can do something like
				// dojo.style(this.chart.domNode, "outline", "none");
			}
		},
		
		disconnect: function(){
			// summary:
			//		Disconnect this action from the chart.
			this.inherited(arguments);
			if(this.enableKeyZoom){
				// we don't need anymore to be able to get focus to receive key events 
				domProp.set(this.chart.domNode, "tabindex", "-1");
			}
			// in case we disconnect before the end of the action
			this._disconnectHandles();
		},
	
		onMouseDown: function(event){
			// summary:
			//		Called when mouse is down on the chart.
			var chart = this.chart, axis = chart.getAxis(this.axis);
			if(!axis.vertical){
				this._startCoord = event.pageX;
			}else{
				this._startCoord = event.pageY;
			}
			this._startOffset = axis.getWindowOffset();
			this._isPanning = true;
			// we now want to capture mouse move events everywhere to avoid
			// stop scrolling when going out of the chart window
			if(has("ie")){
				this._handles.push(connect.connect(this.chart.domNode, "onmousemove", this, "onMouseMove"));
				this._handles.push(connect.connect(this.chart.domNode, "onmouseup", this, "onMouseUp"));
				this.chart.domNode.setCapture();
			}else{
				this._handles.push(connect.connect(win.doc, "onmousemove", this, "onMouseMove"));
				this._handles.push(connect.connect(win.doc, "onmouseup", this, "onMouseUp"));
			}
			chart.domNode.focus();
			// prevent the browser from trying the drag on the "image"
			eventUtil.stop(event);
		},
	
		onMouseMove: function(event){
			// summary:
			//		Called when mouse is moved on the chart.
			if(this._isPanning){
				var chart = this.chart, axis = chart.getAxis(this.axis);
				var delta = this._getDelta(event);
				
				var bounds = axis.getScaler().bounds,
					s = bounds.span / (bounds.upper - bounds.lower);
		
				var scale = axis.getWindowScale();
				chart.setAxisWindow(this.axis, scale, this._startOffset - delta / s / scale);
				chart.render();
			}
		},
	
		onMouseUp: function(event){
			// summary:
			//		Called when mouse is up on the chart.
			this._isPanning = false;
			this._disconnectHandles();
		},
		
		onMouseWheel: function(event){
			// summary:
			//		Called when mouse wheel is used on the chart.
			var scroll = event.wheelDelta / sUnit;
			// on Mozilla the sUnit might actually not always be 3
			// make sure we never have -1 < scroll < 1
			if(scroll > -1 && scroll < 0){
				scroll = -1;
			}else if(scroll > 0 && scroll < 1){
				scroll = 1;
			}
 			this._onZoom(scroll, event);
		},
		
		onKeyPress: function(event){
			// summary:
			//		Called when a key is pressed on the chart.
			if(keyTests[this.keyZoomModifier](event)){
				if(event.keyChar == "+" || event.keyCode == keys.NUMPAD_PLUS){
					this._onZoom(1, event);
				}else if(event.keyChar == "-" || event.keyCode == keys.NUMPAD_MINUS){
					this._onZoom(-1, event);					
				}
			} 
		},
		
		onDoubleClick: function(event){
			// summary:
			//		Called when the mouse is double is double clicked on the chart. Toggle between zoom and fit chart.
			var chart = this.chart, axis = chart.getAxis(this.axis);
			var scale = 1 / this.scaleFactor;
			// are we fit?
			if(axis.getWindowScale()==1){
				// fit => zoom
				var scaler = axis.getScaler(), start = scaler.bounds.from, end = scaler.bounds.to, 
				oldMiddle = (start + end) / 2, newMiddle = this.plot.toData({x: event.pageX, y: event.pageY})[this.axis], 
				newStart = scale * (start - oldMiddle) + newMiddle, newEnd = scale * (end - oldMiddle) + newMiddle;
				chart.zoomIn(this.axis, [newStart, newEnd]);
			}else{
				// non fit => fit
				chart.setAxisWindow(this.axis, 1, 0);
				chart.render();
			}
			eventUtil.stop(event);
		},
		
		_onZoom: function(scroll, event){
			var scale = (scroll < 0 ? Math.abs(scroll)*this.scaleFactor : 
				1 / (Math.abs(scroll)*this.scaleFactor));
			var chart = this.chart, axis = chart.getAxis(this.axis);
			// after wheel reset event position exactly if we could start a new scroll action
			var cscale = axis.getWindowScale();
			if(cscale / scale > this.maxScale){
				return;
			}
			var scaler = axis.getScaler(), start = scaler.bounds.from, end = scaler.bounds.to;
			// keep mouse pointer as transformation center if available otherwise center
			var middle = (event.type == "keypress") ? (start + end) / 2 :
				this.plot.toData({x: event.pageX, y: event.pageY})[this.axis];
			var newStart = scale * (start - middle) + middle, newEnd = scale * (end - middle) + middle;
			chart.zoomIn(this.axis, [newStart, newEnd]);
			// do not scroll browser
			eventUtil.stop(event);
		},
		
		_getDelta: function(event){
			return this.chart.getAxis(this.axis).vertical?(this._startCoord- event.pageY):(event.pageX - this._startCoord);
		}
	});
	return has("dojo-bidi")? declare([MouseZoomAndPan, BidiMouseZoomAndPan]) : MouseZoomAndPan;
});
