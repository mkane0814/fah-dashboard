Vue.component('my-table', {
	template: '#table-template',
	props: {
		users: Array
	}
})

var app = new Vue({
	el: '#app-1',
	data: {
		users: []
	},
});

Vue.http.get('http://localhost:3000/25/users').then(function(response) {
	app.users = response.body
}, function(response) {
	console.log(response.status);
});
