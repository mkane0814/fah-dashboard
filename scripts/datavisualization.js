var vm = new Vue({
	el: '#app',
	data: {
		output: "",
		dates: []
	},
	methods: {
		getDate: function() {
			testdata.forEach(function(user) {
				user.hourly.forEach(function(hour) {
					vm.dates.push(new Date(hour.date));
				});
			});
			this.output = this.dates.join("\n");
		},
		drawGraph: function() {

			var colors = ["red", "green", "blue", "orange", "purple"];

			// This determines the min/max bounds for the y axis
			var min = 0;
			var max = 0;

			for (var i = 0; i < testdata.length; i++)
			{
				for (var k = 0; k < testdata[i].hourly.length; k++)
				{
					if (testdata[i].hourly[k].units > max)
						max = testdata[i].hourly[k].units;
					else if (testdata[i].hourly[k].units < min)
						min = testdata[i].hourly[k].units
				}
			}

			var minDate = new Date(testdata[0].hourly[0].date);
			var maxDate = new Date(testdata[0].hourly[0].date);
			for (var i = 0; i < testdata.length; i++) {
				for (var j = 0; j < testdata[i].hourly.length; j++) {
					var tempDate = new Date(testdata[i].hourly[j].date);
					if (tempDate > maxDate) {
						maxDate = tempDate;
					} else if (tempDate < minDate){
						minDate = tempDate;
					}
				}
			}

			alert(minDate + "\n" + maxDate)

			var vis = d3.select("#visualisation"),
				WIDTH = 1000,
				HEIGHT = 500,
				MARGINS = {
					top: 20,
					right: 20,
					bottom: 20,
					left: 50
				},
				//xScale = d3.scaleLinear()
				//	.range([MARGINS.left, WIDTH - MARGINS.right])
				//	.domain([0,10]),
				xScale = d3.scaleTime()
					.range([MARGINS.left, WIDTH - MARGINS.right])
					.domain([minDate,maxDate]),
				yScale = d3.scaleLinear()
					.range([HEIGHT - MARGINS.top, MARGINS.bottom])
					.domain([min,max]),
				xAxis = d3.axisBottom()
					.scale(xScale),

				yAxis = d3.axisLeft()
					.scale(yScale);

			var lineGen = d3.line()
				.x(function(d) {
					return xScale(new Date(d.date));
				})
				.y(function(d) {
					return yScale(d.units);
				});

			vis.append("svg:g")
				.attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
				.call(xAxis);

			vis.append("svg:g")
				.attr("transform", "translate(" + (MARGINS.left) + ",0)")
				.call(yAxis);

			for (var i = 0; i < testdata.length; i++) {
				vis.append('svg:path')
					.attr('d', lineGen(testdata[i].hourly, i))
					.attr('stroke', colors[i])
					.attr('stroke-width', 2)
					.attr('fill', 'none');
			}
		}
	}
});
