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

var activeTab = document.getElementById("users-tab");
var sortingBy = "score";
var sortOrder = -1;
const limit = 25;
var pageNum = 1;

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
	console.log(sortBy);
	if (sortBy == sortingBy)
		sortOrder *= -1;
	else
		sortOrder = -1;
	Vue.http.get('http://localhost:3000/sort/users/' + sortBy + '/' + limit + '/' + pageNum).then(function(response) {
		usersApp.users = response.body;
	}, function(response) {});
};

document.getElementById("teams-table").onclick = function(event) {
	var clicked = event.target.parentElement;
	if (clicked.tagName == "TD") {
		// handle adding team to graph
		return;
	}
	var sortBy = clicked.getAttribute("id");
	console.log(sortBy);
	if (sortBy == sortingBy)
		sortOrder *= -1;
	else
		sortOrder = -1;
	Vue.http.get('http://localhost:3000/sort/teams/' + sortBy + '/' + limit + '/' + pageNum).then(function(response) {
		teamsApp.teams = response.body;
	}, function(response) {});
};
