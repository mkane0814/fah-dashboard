Vue.component('my-table', {
	template: '#table-template',
	props: {
		users: Array
	}
})

var app = new Vue({
	el: '#app-1',
	data: {
		users: [
			{
				_id: { name: 'Allen', teamID: '12' },
				rank: 1,
				score: 20,
				units: 5,
				rankChange: 0,
				scoreChange: 2,
				unitsChange: 1
			},
			{
				_id: { name: 'Bob', teamID: '7' },
				rank: 2,
				score: 19,
				units: 7,
				rankChange: 0,
				scoreChange: 3,
				unitsChange: 2
			}
		]
	}
});

/*
this.$http.get('apiURL').success(function(users) {
	this.$set('users', users);
}).error(function(error) {
	console.log(error);
});
*/
