const dbconfig = require('./dbconfig.js');
const mysql = require('mysql');

function DB () {

  const db = mysql.createPool({
    connectionLimit: 10,
    host: dbconfig.options.host,
    user: dbconfig.options.user,
    password: dbconfig.options.password,
    database : dbconfig.options.database
  });

  this.query = function(query, callback) {
    db.getConnection(function(err, connection) {
      connection.query(query,function(err,rows){
          connection.release();
          if(err) {
            console.log(err);
            throw err;
          }
          callback(rows);
      });
    });
  }

  // Solves protocol_connection_lost issue by
  // issuing a mysql query every 5 minutes
  setInterval(function () {
    db.query('SELECT 1');
  }, 5 * 60 * 1000);
}
module.exports = DB;
