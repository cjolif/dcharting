define(["dojo/_base/lang", "dojo/_base/declare", "./Element"],
	function(lang, declare, Element){
	/*=====
	var __SeriesCtorArgs = {
		// summary:
		//		An optional arguments object that can be used in the Series constructor.
		// plot: dcharting/plot2d/Base
		//		The plot that this series belongs to.
	};
	=====*/
	return declare(Element, {
		// summary:
		//		An object representing a series of data for plotting on a chart.
		constructor: function(data, kwArgs){
			// summary:
			//		Create a new data series object for use within charting.
			// data: Array|Object
			//		The array of data points (either numbers or objects) that
			//		represents the data to be drawn. Or it can be an object. In
			//		the latter case, it should have a property "data" (an array),
			//		destroy(), and setSeriesObject().
			// kwArgs: __SeriesCtorArgs?
			//		An optional keyword arguments object to set details for this series.
			if(data.data){
				lang.mixin(this, data);
				this.update(data.data);
			}else{
				lang.mixin(this, kwArgs);
				this.update(data);
			}
			this.type = "Series";
		},

		clear: function(){
			// summary:
			//		Clear the calculated additional parameters set on this series.
			this.dyn = {};
		},
		
		update: function(data){
			// summary:
			//		Set data and make this object dirty, so it can be redrawn.
			// data: Array|Object
			//		The array of data points (either numbers or objects) that
			//		represents the data to be drawn. Or it can be an object. In
			//		the latter case, it should have a property "data" (an array),
			//		destroy(), and setSeriesObject().
			if(lang.isArray(data)){
				this.data = data;
			}else{
				this.source = data;
				this.data = this.source.data;
				if(this.source.setSeriesObject){
					this.source.setSeriesObject(this);
				}
			}
			this.dirty = true;
			this.clear();
		}
	});
});
