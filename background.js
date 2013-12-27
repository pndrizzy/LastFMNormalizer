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

window.onload = function() {
    //listen to all requests
    chrome.webRequest.onBeforeRequest.addListener(
      function(details) {
        //if the URL that we requested has last.fm/user in the URL...
        if(details.url.indexOf("last.fm/user/") != -1 ) {
          
            //get the part of the url after last.fm/user ex bdkmvibe/charts
            var startIndex = details.url.indexOf("last.fm/user/") + 13;
            var restOfUrl = details.url.substring(startIndex);
           
            //determine whether or not we are on the main profile page. We aren't if there are any slashes.
            var slashExists = restOfUrl.indexOf("/");
            
            //If no slash, run the script.
            if(slashExists == -1) {
                chrome.tabs.executeScript(null, {file: "content_script.js"});
            }
        }
      },
      {urls: ["*://*.last.fm/*"]}
    );
};