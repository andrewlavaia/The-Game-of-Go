
//-------- ScoreEstimator------------------------------------------------------------------------


 var Point = function(i,j) {
 	this.x = i;
 	this.y = j;
 };

var Goban = function(size) {
	this.width = size;
	this.height = size;
	this.board = new Array();
	for(var i = 0; i < size; i++) {
		this.board[i] = new Array();
		for(var j = 0; j < size; j++) {
			this.board[i][j] = 0;
		}
	}
	this.possible_ko = new Point(-1,-1);


};

Goban.prototype = {

	constructor: Goban,

	/**
	 * Gets actual position.
	 *
	 * @return {WGo.Position} actual position
	 */
/*
	getPosition: function() {
		return this.stack[this.stack.length-1];
	},
*/

	estimate: function(player_to_move, trials, tolerance) {

	    var ret = new Goban(this.height); 
	    int   track[MAX_HEIGHT][MAX_WIDTH];

	    var do_ko_check = 0;
	    this.possible_ko = new Point(-1,-1);
	    //memset(track, 0, sizeof(track));

	    for (int i=0; i < trials; ++i) {
	        /* Play out a random game */
	        var t = new Goban(19); // replace with size
	        t.play_out_position(player_to_move);

	        /* fill in territory */
	        for (int y=0; y < this.height; ++y) {
	            for (int x=0; x < this.width; ++x) {
	                var p = new Point(x,y);
	                if (t[p] == 0) {
	                    if (t.is_territory(p, WGo.B)) {
	                        t.fill_territory(p, WGo.B);
	                    }
	                    if (t.is_territory(p, WGo.W)) {
	                        t.fill_territory(p, WGo.W);
	                    }
	                }
	            }
	        }

	        /* track how many times each spot was white or black */
	        for (int y=0; y < height; ++y) {
	            for (int x=0; x < width; ++x) {
	                track[y][x] += t.board[y][x];
	            }
	        }
	    }


	    /* For each stone group, find the maximal track counter and set
	     * all stones in that group to that level */
	    Goban visited;
	    for (int y=0; y < height; ++y) {
	        for (int x=0; x < width; ++x) {
	            Point p(x,y);
	            if (!visited[p]) {
	                synchronize_tracking_counters(track, visited, p);
	            }
	        }
	    }


	    /* Create a result board based off of how many times each spot
	     * was which color. */
	    for (int y=0; y < height; ++y) {
	        for (int x=0; x < width; ++x) {
	            Point p(x,y);
	            /* If we're pretty confident we know who the spot belongs to, mark it */
	            if (track[y][x] > trials*tolerance) {
	                ret.board[y][x] = 1;
	            } else if (track[y][x] < trials*-tolerance) {
	                ret.board[y][x] = -1;
	            /* if that fails, it's probably just dame */
	            } else {
	                ret.board[y][x] = 0;
	            }
	        }
	    }


	    /* TODO: Foreach hole, if it can only reach one color, color it that */
	    for (int y=0; y < height; ++y) {
	        for (int x=0; x < width; ++x) {
	            Point p(x,y);
	            if (ret[p] == 0) {
	                if (ret.is_territory(p, BLACK)) {
	                    ret.fill_territory(p, BLACK);
	                }
	                if (ret.is_territory(p, WHITE)) {
	                    ret.fill_territory(p, WHITE);
	                }
	            }
	        }
	    }


	    return ret;
	}


}