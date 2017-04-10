Vue.component('stats-table', {
	template: '#table-template',
	props: {
		seen: Boolean,
		group: Array
	}
});

var usersApp = new Vue({
	el: '#users-table',
	data: {
		seen: true,
		users: []
	},
});

var teamsApp = new Vue({
	el: '#teams-table',
	data: {
		seen: false,
		teams: []
	},
});

Vue.http.get('http://localhost:3000/sort/users/score/25/-1/1').then(function(response) {
	usersApp.users = response.body;
}, function(response) {});

Vue.http.get('http://localhost:3000/sort/teams/score/25/-1/1').then(function(response) {
	teamsApp.teams = response.body;
}, function(response) {});

var activeTab = document.getElementById("users-tab");
var usersSortingBy = "score";
var teamsSortingBy = "score";
var usersSortOrder = -1;
var teamsSortOrder = -1;
var usersPageNum = 1;
var teamsPageNum = 1;
const limit = 25;

document.getElementById("tabs").onclick = function(event) {
	var tabClicked = event.target.parentElement;
	if (tabClicked == activeTab)
		return;
	activeTab.removeAttribute("class");
	tabClicked.setAttribute("class", "active");
	activeTab = tabClicked;
	usersApp.seen = !usersApp.seen;
	teamsApp.seen = !teamsApp.seen;
};

document.getElementById("users-table").onclick = function(event) {
	var clicked = event.target.parentElement;
	if (clicked.tagName == "TD") {
		// handle adding user to graph
		return;
	}
	var sortBy = clicked.getAttribute("id");
	if (sortBy == usersSortingBy)
		usersSortOrder *= -1;
	else
		usersSortOrder = -1;
	Vue.http.get('http://localhost:3000/sort/users/' + sortBy + '/' + limit + '/' + usersSortOrder.toString() + '/1').then(function(response) {
		usersApp.users = response.body;
		usersSortingBy = sortBy;
	}, function(response) {});
};

document.getElementById("teams-table").onclick = function(event) {
	var clicked = event.target.parentElement;
	if (clicked.tagName == "TD") {
		// handle adding team to graph
		return;
	}
	var sortBy = clicked.getAttribute("id");
	if (sortBy == teamsSortingBy)
		teamsSortOrder *= -1;
	else
		teamsSortOrder = -1;
	Vue.http.get('http://localhost:3000/sort/teams/' + sortBy + '/' + limit + '/' + teamsSortOrder.toString() + '/1').then(function(response) {
		teamsApp.teams = response.body;
		teamsSortingBy = sortBy;
	}, function(response) {});
};
