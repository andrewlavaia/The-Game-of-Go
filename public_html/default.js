/* globals username, userid, io, google */

'use strict';

(function () {
  WinJS.UI.processAll().then(function () { // eslint-disable-line
    var socket;
    var serverGame;
    var usersOnline = [];
    var myGames = [];

    // seek chart - should be same array that is on server
    var seekChartDataTable =
      [
        ['Time', 'Rank', 'TimeType', 'Seconds', 'Periods', 'SeekID', 'Username', 'isRated'],
      ];

    // initiate socket
    socket = io();

    // ---------------------------
    // Game Lobby Functions
    // ---------------------------

    function updateGamesList() {
      // reset all elements
      if (myGames.length === 0) {
        document.getElementById('gamesList').innerHTML = 'No Active Games';
      } else {
        document.getElementById('gamesList').innerHTML = '';

        myGames.forEach(function (game) {
          $('#gamesList').append($('<button>') // !!! update CSS to make this nicer
            .text('#' + game)
            .on('click', function () {
              socket.emit('resumegame', game);
            }));
        });
      }
    }

    function updateUserList() {
      document.getElementById('userList').innerHTML = '';
      usersOnline.forEach(function (user) {
        $('#userList').append($('<button>') // !!! update CSS to make this nicer
          .text(user)
          .on('click', function () {
            socket.emit('invite', {
              opponentId: user,
              time: {
                type: 'sudden_death',
                seconds: 30,
                periods: 0,
              },
              seekId: 0,
              isRated: 0,
            });
          }));
      });
    }

    function addUser(userId) {
      usersOnline.push(userId);
      updateUserList();
    }

    function removeUser(userId) {
      var i;
      for (i = 0; i < usersOnline.length; i++) {
        if (usersOnline[i] === userId) {
          usersOnline.splice(i, 1);
        }
      }
      updateUserList();
    }

    // ---------------------------
    // Seek Graph Functions
    // ---------------------------

    function canAccessGoogleVisualization() {
      if ((typeof google === 'undefined') || (typeof google.visualization === 'undefined')) {
        return false;
      }
      return true;
    }

    function drawChart() {
      var chartData;
      var chartOptions = {};
      var chartView;
      var chart = new google.visualization.ScatterChart(document.getElementById('chart_div'));

      var selectHandler = function (e) {
        var dataRow = chart.getSelection()[0].row;
        var dataColTimeType = 2; // Time Type column #
        var dataColSeconds = 3; // Seconds column #
        var dataColPeriods = 4; // Periods column #
        var dataColSeekID = 5; // SeekID column #
        var dataColOpponent = 6; // seek username column #
        var dataColIsRated = 7; // is rated column #
        if (username !== chartData.getValue(dataRow, dataColOpponent)) {
          // alert('SeekID ' + chartData.getValue(dataRow, dataSeekID) + ' selected');
          socket.emit('invite', {
            opponentId: chartData.getValue(dataRow, dataColOpponent),
            time: {
              type: chartData.getValue(dataRow, dataColTimeType),
              seconds: chartData.getValue(dataRow, dataColSeconds),
              periods: chartData.getValue(dataRow, dataColPeriods),
            },
            seekId: chartData.getValue(dataRow, dataColSeekID),
            isRated: chartData.getValue(dataRow, dataColIsRated),
          });
        } else {
          alert('Can not start your own seek');
        }
      };

      if (canAccessGoogleVisualization()) {
        chartData = google.visualization.arrayToDataTable(seekChartDataTable);

        chartOptions = {
          title: 'Available Games',
          hAxis: {
            title: 'Time',
            minValue: 1,
            maxValue: 90,
            ticks: [1, 3, 15, 90],
            logScale: true,
            viewWindowMode: 'maximized',
            viewWindow: {
              min: 1,
              max: 90,
            },
          },
          vAxis: {
            title: 'Rank',
            minValue: -30,
            maxValue: 10,
            ticks: [{
              v: -30,
              f: '30k',
            }, {
              v: -20,
              f: '20k',
            }, {
              v: -10,
              f: '10k',
            }, {
              v: -5,
              f: '5k',
            }, {
              v: 5,
              f: '5d',
            }],
          },
          legend: 'none',
          tooltip: {
            isHtml: true,
            // trigger: 'selection',
          },
          focusTarget: 'datum',
        };

        chartView = new google.visualization.DataView(chartData);

        chartView.setColumns([0, 1, {
          type: 'string',
          role: 'tooltip',
          properties: {
            html: true,
          },
          calc: function (dt, row) {
            // var totalTime = dt.getFormattedValue(row, 0);
            var rank = dt.getFormattedValue(row, 1);
            var timeType = dt.getFormattedValue(row, 2);
            var seconds = dt.getFormattedValue(row, 3);
            var periods = dt.getFormattedValue(row, 4);
            // var seekID = dt.getFormattedValue(row, 5);
            var chartusername = dt.getFormattedValue(row, 6);
            var isRated = dt.getFormattedValue(row, 7);
            var isRatedString;

            var isRatedString = (parseInt(isRated, 10) === 0 ? 'Unrated' : 'Rated');

            return '<div class="chart-tooltip"> <span>' + timeType + '</span><br />' +
              '<span class="tooltipHeader">Time</span>: ' + seconds + ' | ' + periods +
              '<br /> <span class="tooltipHeader">User</span>: ' + chartusername + '(' +
              rank + ') <br /> ' + isRatedString + '</div>';
          },
        }]);

        google.visualization.events.addListener(chart, 'select', selectHandler);

        chart.draw(chartView, chartOptions);
      }
    }


    // ---------------------------
    // Socket.io Handlers
    // ---------------------------

    socket.on('updateLobby', function (msg) {
      usersOnline = msg.users;
      updateUserList();

      myGames = msg.games;
      updateGamesList();
    });

    socket.on('joinLobby', function (msg) {
      removeUser(msg); // in case the user is already in the lobby for whatever reason
      addUser(msg);
    });

    socket.on('leaveLobby', function (msg) {
      removeUser(msg);
    });

    socket.on('addSeeks', function (msg) {
      seekChartDataTable = msg;
      google.charts.setOnLoadCallback(drawChart); // needs to be on callback

      /*
      seekChartDataTable.push([8, -24,'Sudden Death', 60, 0, 4420, 'test1']);
      seekChartDataTable.push([4, 5, 'Sudden Death', 60, 0, 2330, 'test2']);
      seekChartDataTable.push([11, 5, 'Sudden Death', 60, 0, 2301, 'test3']);
      seekChartDataTable.push([8, 5, 'Sudden Death', 60, 0, 10, 'test4']);
      seekChartDataTable.push([3, 3, 'Sudden Death', 60, 0, 12309, 'test5']);
      seekChartDataTable.push([40, -7, 'Sudden Death', 60, 0, 1004, 'test6']);
      */

      // console.log("Seek added - " + msg);
    });

    socket.on('resign', function (msg) {
      if (msg.gameId === serverGame.id) {
        socket.emit('login', username);

        updateGamesList(); // used when resign is broadcasted
      }
    });

    socket.on('joingame', function (msg) {
      console.log('joining game id: ' + msg.game.id);

      // send client to new url
      window.location.href = '/games/' + msg.game.id;
    });

    socket.on('logout', function (msg) {
      removeUser(msg.username);
    });

    socket.on('ping', function () {
      socket.emit('pong');
    });

    /*
    socket.on('drawChart', function() {
      drawChart();
    });
    */

    // --------------------------
    // Button Event Handlers
    // --------------------------

    $('#5m').on('click', function () {
      socket.emit('createSeek', {
        seekuserid: userid,
        seekusername: username,
        seekuserrank: 5,
        time: {
          type: 'Sudden Death',
          seconds: 60 * 5,
          periods: 0,
        },
        isRated: 1,
      });
    });

    $('#15s5').on('click', function () {
      socket.emit('createSeek', {
        seekuserid: userid,
        seekusername: username,
        seekuserrank: 5,
        time: {
          type: 'Japanese',
          seconds: 15,
          periods: 5,
        },
        isRated: 1,
      });
    });

    $('#30s5').on('click', function () {
      socket.emit('createSeek', {
        seekuserid: userid,
        seekusername: username,
        seekuserrank: 5,
        time: {
          type: 'Japanese',
          seconds: 30,
          periods: 5,
        },
        isRated: 1,
      });
    });

    $('#createCustomSeek').on('click', function () {
      var customGameSeconds = parseInt($('input[name=customGameSeconds]').val(), 10);
      var customGamePeriods = parseInt($('input[name=customGamePeriods]').val(), 10);
      var customGameRating = parseInt($('input[name=customGameRated]:checked').val(), 10);
      var customGameType;

      if (customGamePeriods === '' || customGamePeriods === 0) {
        customGameType = 'Sudden Death';
        customGamePeriods = parseInt(0, 10);
        if (customGameSeconds < 60) { // can't be less than 1 min sudden death
          // alert('Game cannot be less than 1 minute with 0 periods');
          // !!! limit input to always be greater than 60 seconds
          return;
        }
      } else {
        customGameType = 'Japanese';
        customGamePeriods = parseInt(customGamePeriods, 10); // convert string to number
      }

      if (typeof customGameSeconds === 'number' &&
        typeof customGamePeriods === 'number' &&
        customGameSeconds != null &&
        customGamePeriods != null) {
        socket.emit('createSeek', {
          seekuserid: userid,
          seekusername: username,
          seekuserrank: 5,
          time: {
            type: customGameType,
            seconds: customGameSeconds,
            periods: customGamePeriods,
          },
          isRated: customGameRating,
        });

        $('input[name=customGameSeconds]').val('');
        $('input[name=customGamePeriods]').val('');
      } else {
        alert('Not a valid entry');
      }
    });

    // --------------------------
    // Seek Graph
    // --------------------------

    google.charts.load('current', {
      packages: ['corechart'],
    });
    google.charts.setOnLoadCallback(drawChart);
  }); // end WinJS.UI.processAll()
})(); // end self invoking function
