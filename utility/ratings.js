/*
Elo 	Go rank
3000	10 dan professional
2900	9 dan professional
2800	8 dan professional
2700	7 dan amateur or 1 dan professional.
2600	6 dan (amateur)
2500	5 dan
2400	4 dan
2300	3 dan
2200	2 dan
2100	1 dan
2000	1 kyu
1600	5 kyu
1120	10 kyu
740		15 kyu
450		20 kyu
0		30 kyu
*/
module.exports = {

	convertEloToRank: function(elo) {
		var rank;
		if(elo < 40)
			rank = -30;
		else if(elo >= 40 && elo < 80)
			rank = -29;
		else if(elo >= 80 && elo < 120)
			rank = -28;
		else if(elo >= 120 && elo < 160)
			rank = -27;
		else if(elo >= 160 && elo < 200)
			rank = -26;
		else if(elo >= 200 && elo < 250)
			rank = -25;
		else if(elo >= 250 && elo < 300)
			rank = -24;
		else if(elo >= 300 && elo < 350)
			rank = -23;
		else if(elo >= 350 && elo < 400)
			rank = -22;
		else if(elo >= 400 && elo < 450)
			rank = -21;
		else if(elo >= 450 && elo < 500)
			rank = -20;
		else if(elo >= 500 && elo < 560)
			rank = -19;
		else if(elo >= 560 && elo < 620)
			rank = -18;
		else if(elo >= 620 && elo < 680)
			rank = -17;
		else if(elo >= 680 && elo < 740)
			rank = -16;
		else if(elo >= 740 && elo < 800)
			rank = -15;
		else if(elo >= 800 && elo < 880)
			rank = -14;
		else if(elo >= 880 && elo < 960)
			rank = -13;
		else if(elo >= 960 && elo < 1040)
			rank = -12;
		else if(elo >= 1040 && elo < 1120)
			rank = -11;
		else if(elo >= 1120 && elo < 1200)
			rank = -10;
		else if(elo >= 1200 && elo < 1300)
			rank = -9;
		else if(elo >= 1300 && elo < 1400)
			rank = -8;
		else if(elo >= 1400 && elo < 1500)
			rank = -7;
		else if(elo >= 1500 && elo < 1600)
			rank = -6;
		else if(elo >= 1600 && elo < 1700)
			rank = -5;
		else if(elo >= 1700 && elo < 1800)
			rank = -4;
		else if(elo >= 1800 && elo < 1900)
			rank = -3;
		else if(elo >= 1900 && elo < 2000)
			rank = -2;
		else if(elo >= 2000 && elo < 2100)
			rank = -1;
		else if(elo >= 2100 && elo < 2200)
			rank = 1;
		else if(elo >= 2200 && elo < 2300)
			rank = 2;
		else if(elo >= 2300 && elo < 2400)
			rank = 3;
		else if(elo >= 2400 && elo < 2500)
			rank = 4;
		else if(elo >= 2500 && elo < 2600)
			rank = 5;
		else if(elo >= 2600 && elo < 2700)
			rank = 6;
		else if(elo >= 2700 && elo < 2800)
			rank = 7;
		else if(elo >= 2800 && elo < 2900)
			rank = 8;
		else if(elo >= 2900 && elo < 3000)
			rank = 9;
		else if(elo >= 3000)
			rank = 10;

		return rank;
	},

	convertRankToString: function(rank) {
		var rankString;

		if(rank < 0)
			rankString = Math.abs(rank) + " kyu"
		else
			rankString = rank + " dan"

		return rankString;

	}

}
