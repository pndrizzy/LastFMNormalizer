/*

    Last.FM Normalizer - Artist charts by duration, not playcounts.
    Copyright (C) 2013 Michael Hogue <mikedhogue@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/



var DEBUG_MODE = 0; //1 == DEBUG
function httpGet(url) {
    var xmlHttp = null;
    xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

function secondsToString(seconds) {
    var numdays = Math.floor(seconds / 86400);
    var numhours = Math.floor((seconds % 86400) / 3600);
    var numminutes = Math.floor(((seconds % 86400) % 3600) / 60);
    var numseconds = ((seconds % 86400) % 3600) % 60;
    
    var result = "";
    if(numdays > 0) {
        result += numdays + " days ";
    }
    if(numhours > 0) {
        result += numhours + " hours ";
    }
    if(numminutes > 0) {
        result += numminutes + " minutes ";
    }
    if(numseconds > 0 || result == "") {
        result += numseconds + " seconds";
    }
    return result;
}

function secondsToString2(seconds) {
    var numdays = Math.floor(seconds / 86400);
    var numhours = Math.floor((seconds % 86400) / 3600);
    var numminutes = Math.floor(((seconds % 86400) % 3600) / 60);
    var numseconds = ((seconds % 86400) % 3600) % 60;
    
    var result = "";
    if(numdays > 0) {
        result += numdays + "d ";
    }
    if(numhours > 0) {
        result += numhours + "h ";
    }
    if(numminutes > 0) {
        result += numminutes + "m ";
    }
    if(numseconds > 0) {
        result += numseconds + "s";
    }
    if(result == "") {
        result = "0s";
    }
    return result;
}

function sort(artistMap) {
    
    //we're going to go from a map to an array which will hold the data sorted
    var sortedArray = [];
    
    //so push the data like this: [ [Artist, Duration], [Artist, Duration] ], or an array of arrays 
    for (var key in artistMap) {
        sortedArray.push([key, artistMap[key]]);
    }

    //Now lets sort on the value of the durations
    sortedArray.sort(function(a, b) {
        a = a[1];
        b = b[1];
        return a > b ? -1 : (a < b ? 1 : 0);
    });
    
    //and return it
    return sortedArray;
}

var TOTAL_RESPONSES = 0;
var artistMap = {};
var gettingPages = false;
function getPages(timeframe, userName) {

    gettingPages = true;
    
    
    //tempPages will be an array of the pages of results, each 10 artists long. So if the timeframe has 100 artists, then there will be 10 pages.
    var tempPages = [];
    TOTAL_RESPONSES = 0;
    //a map that will hold artist to play duration information; ex { The Beatles : 1000, The Doors : 100 } 
    
    //current page we are getting from the API
    var page = 1;
    
    //We need to know how many tracks the user has played within this timeframe. Last.FM Api times out at large requests, so we will request in chunks of 100 tracks, so we 
    //need to know how many trequests we are going to make
    var getTotalPagesRequest = httpGet("http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=" + userName + "&api_key=30034e98a7134350b2c8153d313d17b9&format=json&period=" + timeframe + "&limit=1");
    
    //Read the response about how many total there are
    try {
        var totalTracks = JSON.parse(getTotalPagesRequest)["toptracks"]["@attr"]["total"];
        //Get the whole number plus one: thats how many pages there are for totalTracks tracs
        var totalPages = ~~((totalTracks / 100) + 1);
        //Let's do it: let's loop totalPages times! 
    } catch(e) {
        gettingPages = false;
        tempPages[1] = [];
        tempPages[1].push(["None", 0]);
        pages = tempPages;
        loadTable(1);
    }
    
    var loading = document.getElementById("loading_div");
    var table = document.getElementById("normalizer_table");
    if(loading && table) {
        table.innerHTML = '';
        loading.innerHTML = '<progress id="normalizer_progress" value="1" max="' + (totalPages+1) + '"></progress>';
    }
    
    for(var i = 0; i < totalPages; i++) {
    
    
        //Make the request for 100 tracks
        try {
          var request = null;
             request = new XMLHttpRequest();
             request.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    
                    TOTAL_RESPONSES++;
                    
                    document.getElementById("normalizer_progress").value = TOTAL_RESPONSES;
                    
                    this.onreadystatechange = null;
                    var results = this.responseText;
                    //parse the JSON
                    var jsonResults = JSON.parse(results);
                    var tracks = jsonResults["toptracks"]["track"];
                    
                    //It's possible that there were no results (ex: user hasn't played anything in last 7 days)
                    if(tracks == undefined) {
                            gettingPages = false;
                            tempPages[1] = [];
                            tempPages[1].push(["None", 0]);
                            pages = tempPages;
                            loadTable(1);
                    }
                    
                    //Go through each track and update the artist map
                    for(var j = 0; j < tracks.length; j++) {
                        
                        //get the information about the track
                        var track = tracks[j];
                        var artistName = track["artist"]["name"];
                        var duration = track["duration"];
                        var playCount = parseInt(track["playcount"]);
                        
                       
                        //multiply the song duration by the playcount, because the song was listened to for that many seconds
                        if(duration != "") {
                           duration = parseInt(duration) * playCount;
                        } else {
                            duration = 150 * playCount; //Last.FM does not know durations of some tracks, so just assume that the tracks are 3 minutes and 30 seconds
                        }
                        
                        //If the artist is already in the map, just increase that value. Otherwise, put it in the map 
                        if(artistName in artistMap) {
                            artistMap[artistName] += duration;
                        } else {
                            artistMap[artistName] = duration;
                        }
                        
                    } 
                    //sort the map. We don't need quick access anymore, so we can just convert it to an array
                    sortedMap = sort(artistMap);
                    
                    //now lets break it up into pages. We're going to waste tempPages[0] because we want easy access; tempPages[1] is the first page.
                    var pageNum = 0;
                    for(var i = 0; i < sortedMap.length; i++) {
                        //If we're at a multiple of 10, increase the page number and put an empty array there.
                        if(i % 10 == 0) {
                            pageNum++;
                            tempPages[pageNum] = [];
                        }
                        tempPages[pageNum].push(sortedMap[i]);
                    }
                    
                    pages = tempPages;

                    
                    loadTable(1);
                    if(TOTAL_RESPONSES == totalPages) {
                    
                        if(loading) {
                            loading.innerHTML = '';
                        }
                    
                        gettingPages = false;
                        localStorage["pages" + timeframe + "_" + userName] = JSON.stringify(pages);
                        localStorage["pages" + timeframe + "_" + userName + "_date"] = Date.now();
                    }
                }
             }; 
             var url = "http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=" + userName + "&api_key=30034e98a7134350b2c8153d313d17b9&format=json&period=" + timeframe + "&limit=100&page=" + page++;
             request.open("GET", url, true);
             request.send(null);

        } catch(e) {
            //If something went wrong, alert the user and return
                
            gettingPages = false;
            tempPages[1] = [];
            tempPages[1].push(["Error getting response!", 0]);
            pages = tempPages;
            loadTable(1);
        }
    }
    
    
}

//Used for updating the table when changing a timeframe or page number
function loadTable(page) {

    //get the table
    var table = document.getElementById("normalizer_table");
    
    //erase everything inside of it, and put in a table body
    table.innerHTML = "<tbody>";

    //get the page that was requested
    artists = pages[page];
    
    //rank is the rank. For example, if this is the fourth page, rank will be 40, and increase by 1 for each artist
    var rank = 1 + (10 * (page - 1));
    
    //the maximum value is used for setting the width of the bars. we need the maximum duration
    var max = artists[0][1];
    
    //go through each artist
    for (var i = 0; i < artists.length; i++) {
        
        //this artists bar width will be the percentage of the maximum one.
        var width = (artists[i][1] / max) * 100;
        
        //however, we want it to at least be 20%, otherwise you cant read any text
        if(width < 20) {
            width = 20;
        }
        
        //used for striped tables: if i is even, then the tr class is odd. This is because we started at zero; its weird.
        var trClass = "";
        if(i % 2 == 0) {
            trClass = "odd"
        }
        
        table.innerHTML += '<tr class="' + trClass + '"><td class="positionCell">' + rank++ + '</td><td class="subjectCell" title="' + artists[i][0] + '"><div><a>' + artists[i][0] + '</a></div></td><td class="chartbarCell"><div style="width:' + width + '%" class="chartbar"><a><span title="' + secondsToString(artists[i][1]) + '">' + secondsToString2(artists[i][1]) + '</span></a></div></td></tr>';
    }

    //end the tbody
    table.innerHTML += "</tbody>";
    
    //if there are multiple pages, add the controls
    if(pages.length > 2) {
    
        //theres always a next page option, put it there
        next.innerHTML = "<a>Next Page</a>";
        next.className = "moduleOptions";
        
    }

}

function removeCurrentClass() {
    //we dont know which tab was current, just remove the current class from all of them
    for(var i = 0; i < document.getElementById("normalizer_tabs").children.length; i++) {
        document.getElementById("normalizer_tabs").children[i].classList.remove("current");
    }
}

function isCacheUsable(timeframe, userName) {
    if(DEBUG_MODE == 1) return false;
    
    //get it out of local storage
    var pages = localStorage["pages" + timeframe + "_" + userName];
    
    //if its not there, we cant use it
    if(pages == null || pages == undefined) {
        return false;
    }   
    
    //check if its outdated
    var pageDate = localStorage["pages" + timeframe + "_" + userName + "_date"];
    
    //if the date isn't there, we can't trust it.
    if(pageDate == null || pageDate == undefined) {
        return false;
    }
    

    pageDate = parseInt(pageDate); //convert to int
    var timeSince = Date.now() - pageDate;
    var acceptableTime;
    
    switch(timeframe) {
        case "7day":
            acceptableTime = 3600000; //1 hour
            break;
        case "1month":
            acceptableTime = 3600000 * 12; //12 hours
            break;
        case "3months":
            acceptableTime = 3600000 * 24 * 1; //1 day
            break;
        case "6months":
            acceptableTime = 3600000 * 24 * 2; //2 days
            break;
        case "1year":
            acceptableTime = 3600000 * 24 * 3; //3 days
            break;
        case "overall":
            acceptableTime = 3600000 * 24 * 7; //1 week
            break;
    }
    
    return timeSince < acceptableTime;
}

function loadPages(timeframe, userName) {
    //We might have the page in localStorage. In order to get better performance, we "cache" results.
    
    artistMap = {};
    //if we can get it from the local storage, do it.
    if(isCacheUsable(timeframe, userName)) {
        pages = JSON.parse(localStorage["pages" + timeframe + "_" + userName]);
        loadTable(1);
    } else {
        //we actually need to make a web request. make the request, and cache it.
        getPages(timeframe, userName);
    }
    return pages;
}



    //loading bar
    var css = 'progress {appearance: none; -webkit-appearance: none;display: block;width: 50%;height: 18px;margin: 20px auto;}progress::-webkit-progress-bar {background: #EBEBEB;border-radius: 3px;}progress::-webkit-progress-value {background: #73B6E3;border-radius: 3px;}progress:not([value])::-webkit-progress-bar {background:#fdd;}';
    var head = document.head;
    var style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    head.appendChild(style);
    
    
    //last.FM has the userName in the second H1 element. Get the username for this profile.
    var userName = document.getElementsByTagName("h1")[1].innerHTML.trim();
    
    //Create a heading element for our new addition to the page
    var heading = document.createElement("h2");
    heading.className = "heading";
    heading.innerHTML = '<span class="h2Wrapper"><a href="#" title>Top Artists (Normalized)</a></span>';

    //Create the day, month year tabs
    var horizontalOptions = document.createElement("div");
    horizontalOptions.className="horizontalOptions clearit";
    horizontalOptions.innerHTML = '<ul id="normalizer_tabs">' +
                                  '<li class="first current chartweek"><a id="7day">Last 7 days</a></li>' + 
                                  '' + //taken out until Last.FM fixes their API <li class="chart1month"><a id="1month">Last month</a></li>
                                  '<li class="chart3month"><a id="3months">Last 3 months</a></li>' +
                                  '<li class="chart6month"><a id="6months">Last 6 months</a></li>' + 
                                  '<li class="chartyear"><a id="1year">Last 12 months</a></li>' +
                                  '<li class="chartoverall"><a id="overall">Overall</a></li>' +
                                  '</ul>';

    //create a div to hold our table
    var divTable = document.createElement("div");
    divTable.className = "module-body chart chartoverall current";
    var loadingDiv = document.createElement("div");
    loadingDiv.id = "loading_div";
    var table = document.createElement("table");
    table.className = "candyStriped chart";
    table.id = "normalizer_table";
    divTable.appendChild(loadingDiv);
    divTable.appendChild(table);
    
    //create the navigation (next, previous) for our info
    
    var more_pages = document.createElement("div");
    more_pages.id = "normalizer_pages";
    
    //we need a next and previous element
    var next = document.createElement("span");
    var prev = document.createElement("span");
    next.id = "normalizer_next";
    prev.id = "normalizer_prev";
    
    
    var current_page = 1;
    
    //when next is clicked, update the table
    next.onclick = function() {
        prev.innerHTML = "<a id=\"normalizer_prev_link\">Previous Page</a>";
        prev.className = "moduleOptions";
        prev.style.float = "left";
        document.getElementById("normalizer_prev_link").style.backgroundImage = "url(" + chrome.extension.getURL("arrow_left.png") + ")";
        document.getElementById("normalizer_prev_link").style.backgroundPosition = "left top";
        document.getElementById("normalizer_prev_link").style.paddingLeft = "18px";
        current_page++;
        
        loadTable(current_page);
        if(pages[current_page + 1] == undefined) {
            this.innerHTML = "";
        } 
        return false;
    };
    //when prev is clicked, update the table
    prev.onclick = function() {
        next.innerHTML = "<a>Next Page</a>";
        next.className = "moduleOptions";
        current_page--;
        loadTable(current_page);
        if(current_page - 1 == 0) {
            this.innerHTML = "";
        }
        return false;
    };
    
    
    more_pages.appendChild(prev); 
    more_pages.appendChild(next); 
       
    //a div to hold all elements
    var thisDiv = document.createElement("div");
    thisDiv.appendChild(heading);
    thisDiv.appendChild(horizontalOptions);
    thisDiv.appendChild(divTable);
    thisDiv.appendChild(more_pages);
    
    //find the TopArtists table, and put it right after it.
    var elements = document.getElementsByClassName('modulechartsartists');
    elements[0].parentNode.insertBefore(thisDiv, elements[0].nextSibling);

    //create the onclick method for each of the tabs
    document.getElementById("7day").onclick = function() {
        if(gettingPages) return false;
        removeCurrentClass();
        this.parentNode.classList.add("current");
        pages = loadPages("7day", userName);
    }
    
    /* Taken out until Last.FM Fixes their API 
    document.getElementById("1month").onclick = function() {
        removeCurrentClass();       
        this.parentNode.classList.add("current");
        pages = loadPages("1month", userName);
        loadTable(1);
    } */
    
    document.getElementById("3months").onclick = function() {
        if(gettingPages) return false;
        removeCurrentClass();       
        this.parentNode.classList.add("current");
        pages = loadPages("3months", userName);
    }
    
    document.getElementById("6months").onclick = function() {
        if(gettingPages) return false;
        removeCurrentClass();       
        this.parentNode.classList.add("current");
        pages = loadPages("6months", userName);
    }
    
    document.getElementById("1year").onclick = function() {
        if(gettingPages) return false;
        removeCurrentClass();       
        this.parentNode.classList.add("current");
        pages = loadPages("1year", userName);
    }
    
    document.getElementById("overall").onclick = function() {
        if(gettingPages) return false;
        removeCurrentClass();       
        this.parentNode.classList.add("current");
        pages = loadPages("overall", userName);
    }
    
    
    
    //load the pages
    var pages = loadPages("7day", userName);
    
    //put the data into the table