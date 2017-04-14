Vue.component('stats-table', {
	template: '#table-template',
	props: {
		seen: Boolean,
		group: Array,
		type: String,
		sort: Function
	}
});

Vue.component('graph', {
	template: '#graph-template',
	props: {
		seen: Boolean
	}
});

const limit = 25;

let usersApp = new Vue({
	el: '#users-table',
	data: {
		seen: true,
		users: [],
		sortingBy: 'score',
		sortOrder: -1
	},
	methods: {
		sort: function(sortBy) {
			if (this.sortingBy === sortBy) {
				this.sortOrder *= -1;
			} else {
				this.sortOrder = -1;
			}

			Vue.http.get('http://localhost:3000/sort/users/' + sortBy + '/' + limit + '/' + this.sortOrder.toString() + '/1')
				.then(function(response) {
					usersApp.users = response.body;
					usersApp.sortingBy = sortBy;
			}, function(response) {});
		}
	}
});

let teamsApp = new Vue({
	el: '#teams-table',
	data: {
		seen: false,
		teams: [],
		sortingBy: 'score',
		sortOrder: -1
	},
	methods: {
		sort: function(sortBy) {
			if (this.sortingBy === sortBy) {
				this.sortOrder *= -1;
			} else {
				this.sortOrder = -1;
			}
			Vue.http.get('http://localhost:3000/sort/teams/' + sortBy + '/' + limit + '/' + this.sortOrder.toString() + '/1').then(function(response) {
				teamsApp.teams = response.body;
				teamsApp.sortingBy = 'score';
			}, function(response) {});
		}
	}
});

let graphApp = new Vue({
	el: '#graph',
	data: {
		seen: false,
		testdata: [
			{
				"_id":{
					"name":"Fryslan",
					"teamID":"53793"
				},
				"rank":248616,
				"score":47205,
				"units":225,
				"rankChange":0,
				"scoreChange":0,
				"unitsChange":0,
				"date":"2017-04-06T21:20:02.000Z",
				"hourly":[
					{
						"rank":248616,
						"score":47205,
						"units":225,
						"date":"2017-04-06T21:20:02.000Z"
					},
					{
						"rank":270482,
						"score":39264,
						"units":174,
						"date":"2017-04-06T20:20:02.000Z"
					},
					{
						"rank":506840,
						"score":8563,
						"units":8,
						"date":"2017-04-06T19:20:02.000Z"
					},
					{
						"rank": 663423,
						"units": 309,
						"date":"2017-04-06T18:20:02.000Z"
					}
				],
				"daily":[]
			},
			{
				"_id": {
					"name":"BOLTZ",
					"teamID":"54737"
				},
				"rank":270482,
				"score":39264,
				"units":174,
				"rankChange":0,
				"scoreChange":0,
				"unitsChange":0,
				"date":"2017-04-06T21:20:02.000Z",
				"hourly":[
					{
						"rank":276482,
						"score":39264,
						"units":474,
						"date":"2017-04-06T21:20:02.000Z"
					},
					{
						"rank": 334567,
						"units": 164,
						"date":"2017-04-06T20:20:02.000Z"
					},
					{
						"rank": 434534,
						"units": 403,
						"date":"2017-04-06T19:20:02.000Z"
					},
					{
						"rank": 600000,
						"units": 900,
						"date":"2017-04-06T18:20:02.000Z"
					}
				],
				"daily":[]
			},
			{
				"_id": {
					"name":"Curecoin",
					"teamID":"224497"
				},
				"rank":506840,
				"score":8563,
				"units":8,
				"rankChange":0,
				"scoreChange":0,
				"unitsChange":0,
				"date":"2017-04-06T21:20:02.000Z",
				"hourly":[
					{
						"rank": 250043,
						"units": 12,
						"date":"2017-04-06T21:20:02.000Z"
					},
					{
						"rank": 300453,
						"units": 70,
						"date":"2017-04-06T20:20:02.000Z"
					},
					{
						"rank": 350000,
						"units": 140,
						"date":"2017-04-06T19:20:02.000Z"
					},
					{
						"rank":506840,
						"score":8563,
						"units":89,
						"date":"2017-04-06T18:20:02.000Z"
					},
					{
						"rank": 598435,
						"units": 304,
						"date":"2017-04-06T17:20:02.000Z"
					}
				],
				"daily":[]
			}
		]
	},
	methods: {
		graphData: function () {

			const colors = ["orangered",
							"seagreen",
							"steelblue",
							"springgreen",
							"tomato",
							"darkorchid",
							"gold",
							"lightseagreen",
							"crimson",
							"cornflowerblue"];

			// This determines the min/max bounds for the y axis
			let min = 0;
			let max = 0;

			for (let i = 0; i < this.testdata.length; i++) {
				for (let k = 0; k < this.testdata[i].hourly.length; k++) {
					if (this.testdata[i].hourly[k].units > max)
						max = this.testdata[i].hourly[k].units;
					else if (this.testdata[i].hourly[k].units < min)
						min = this.testdata[i].hourly[k].units
				}
			}

			let minDate = new Date(this.testdata[0].hourly[0].date);
			let maxDate = new Date(this.testdata[0].hourly[0].date);
			for (let i = 0; i < this.testdata.length; i++) {
				for (let j = 0; j < this.testdata[i].hourly.length; j++) {
					let tempDate = new Date(this.testdata[i].hourly[j].date);
					if (tempDate > maxDate) {
						maxDate = tempDate;
					} else if (tempDate < minDate) {
						minDate = tempDate;
					}
				}
			}

			let vis = d3.select("#visualization"),
				WIDTH = 1000,
				HEIGHT = 500,
				MARGINS = {
					top: 50,
					right: 30,
					bottom: 50,
					left: 50
				},
				//xScale = d3.scaleLinear()
				//	.range([MARGINS.left, WIDTH - MARGINS.right])
				//	.domain([0,10]),
				xScale = d3.scaleTime()
					.range([MARGINS.left, WIDTH - MARGINS.right])
					.domain([minDate, maxDate]),
				yScale = d3.scaleLinear()
					.range([HEIGHT - MARGINS.top, MARGINS.bottom])
					.domain([min, max]),
				xAxis = d3.axisBottom()
					.scale(xScale),
				yAxis = d3.axisLeft()
					.scale(yScale);

			vis.style('border', '#CFCFCF 2px solid')
				.style('border-radius', '4px')
				.style('background', '#F0F0F0')
				.attr('height', HEIGHT)
				.attr('width', WIDTH);

			let lineGen = d3.line()
				.x(function (d) {
					return xScale(new Date(d.date));
				})
				.y(function (d) {
					return yScale(d.units);
				});

			vis.append("svg:g")
				.attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
				.call(xAxis);

			vis.append("svg:g")
				.attr("transform", "translate(" + (MARGINS.left) + ",0)")
				.call(yAxis);

			for (let i = 0; i < this.testdata.length; i++) {
				vis.append('svg:path')
					.attr('d', lineGen(this.testdata[i].hourly, i))
					.attr('stroke', colors[i])
					.attr('stroke-width', 2)
					.attr('fill', 'none');
			}
		}
	},
	watch: {
		seen: function(value) {
			if (value) this.graphData();
		}
	}
});

Vue.http.get('http://localhost:3000/sort/users/score/25/-1/1').then(function(response) {
	usersApp.users = response.body;
}, function(response) {});

Vue.http.get('http://localhost:3000/sort/teams/score/25/-1/1').then(function(response) {
	teamsApp.teams = response.body;
}, function(response) {});

let activeTab = document.getElementById("users-tab");
let usersSortingBy = "score";
let teamsSortingBy = "score";
let usersSortOrder = -1;
let teamsSortOrder = -1;
let usersPageNum = 1;
let teamsPageNum = 1;

document.getElementById("tabs").onclick = function(event) {
	let tabClicked = event.target.parentElement;
	if (tabClicked === activeTab)
		return;
	activeTab.removeAttribute("class");
	tabClicked.setAttribute("class", "active");
	activeTab = tabClicked;
	usersApp.seen = hasClass('users-tab', 'active');
	teamsApp.seen = hasClass('teams-tab', 'active');
	graphApp.seen = hasClass('graph-tab', 'active');
};

function hasClass(element, classname) {
	return document.getElementById(element).className.indexOf(classname) !== -1;
}