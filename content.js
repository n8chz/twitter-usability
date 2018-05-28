// Inject CSS rule to support follower count filtering:
/*
$(function () {
  $("<style>.lose {background-color: \"pink\"}</style>").appendTo($("head"));
});
*/

// see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver#Example_usage

// select the target node
var target = document.querySelector("#page-container");

// Run the option callback if the option is set to true in storage
function setupOption(optionID, callback) {
 chrome.storage.local.get(optionID, function (setting) {
   // Assume options that are not yet stored as keys are set to true
   if (Object.keys(setting).length == 0 || setting[optionID]) {
    callback();
   }
 });
}

function makeVideoLink(videoURL) {
 var videoLink = $("<a>");
 videoLink.attr("href", videoURL);
 videoLink.attr("target", "_blank");
 videoLink.text(videoURL);
 return videoLink;
}

function arrayDiff(array1, array2) {
  let value = [];
  array1.forEach(function (x) {
    if (array2.indexOf(x) == -1) {
      value.push(x);
    }
  });
  return value;
}



optionCallbacks = {
  "virgin-tweets": function () {
    // https://twitter.com/tyronem/status/962725402656628738
    $("#stream-items-id li").not(".visited").each(function () {
      $(this).addClass("visited");
      if ($(this).find("[data-tweet-stat-count=0]").length == 3) {
        $(this).css("background-color", "#fc9");
      }
    });
  },
 "with-replies": function () {
  // By default, a user profile filters out tweets
  // that are replies to other tweets.
  // Turn on this option
  // if you would prefer they be included when you follow a link to a profile.
  $("a.twitter-atreply, a.js-action-profile-link, a.js-user-profile-link")
   .not("[href$='/with_replies']").each(function () {
    var href = $(this).attr("href");
    // This is how Twitter codes the URL for the "with replies" option:
    $(this).attr("href", href+"/with_replies");
  });
 },
 "latest-tweets": function () {
  // By default, hashtag and search links go to "top tweets."
  // With this option turned on, we make them go to "latest" instead:
  $(".u-linkComplex").parent().not("[href$='&f=tweets']").each(function () {
    $(this).attr("href", $(this).attr("href")+"&f=tweets");
  });
  $("[href*='hashtag']").not("[href$='&f=tweets']").each(function () {
    $(this).attr("href", $(this).attr("href")+"&f=tweets");
  });
 },
 "dismiss-things": function () {
  $("DismissibleModule").remove();
 },
 "autoplaying-media": function () {
  $(".AdaptiveMediaOuterContainer").css("border", "5px solid red");
  // Deal with "periscope"
  $(".card-type-periscope_broadcast").each(function () {
    var videoURL = "https://twitter.com"+$(this).attr("data-src");
    var videoLink = makeVideoLink(videoURL);
    $(this).parent().html(videoLink);
  });
  // Video outside main timeline seems to have no redeeming value,
  // so terminate with extreme prejudice.
  $(".LiveVideoHomePageModule-linkOverlayBox").remove();
  // Treatment for videos embedded in tweets:
  var mediaElement = $(".has-autoplayable-media");
  // Mark tweet as one containing otherwise autoplaying video:
  mediaElement.parent().css("background-color", "#cff");
  // src attribute of the <iframe> points to a file that contains the video URL
  var iframe = mediaElement.find("iframe");
  if (iframe.length) {
   var src = iframe.attr("src");
   // We must get that file to get the video URL:
   $.get(src, function (data) {
     // Then we must parse that file
     // to get the JSON object that contains the video URL:
     var doc = (new DOMParser()).parseFromString(data, "text/html");
     var configJSON = $("#playerContainer", doc).attr("data-config");
     // TODO: separate procedure for URL's ending in ".m3u8"
     // Seems such links have "/amplify_video/" in URL path,
     // whereas straight up links to actual video files have "/tweet_video/"
     if (typeof configJSON != "undefined") {
      var videoURL = JSON.parse(configJSON).video_url;
     }
     // Now we create a target="_blank" type link
     // in case you are interested in the video:
     var videoLink = makeVideoLink(videoURL);
     mediaElement.html(videoLink);
   });
  }
  $(".PlayableMedia-player").each(function () {
    return undefined;
  });
 },
 "extreme-prejudice": function () {
  $(".has-autoplayable-media").remove();
 },
/*
 "in-case": function () {
 },
*/
 // The "while you were away" anti-feature is rather annoying:
 "while-away": function () {
  $("[data-item-type='recap_entry']").remove();
 },
 // New:
 "prefer-small": function () { // h/t Chuck Baggett https://twitter.com/ChuckBaggett/status/958156853455843328
    // Hoping to avoid getting swamped by mutations coming in faster than we can process them:
    if (window.bizzy) return;
    window.bizzy = true;
    chrome.storage.local.get("follower-ceiling", function (data) {
      window.ceiling = data["follower-ceiling"];
      window.users = window.users || {};
      // TODO: do things on tweets of users with followers > window.ceiling
      Object.keys(window.users).forEach(function (userId) {
        let userTweets = $(`li:has([data-user-id="${userId}"])`);
        if (window.ceiling > window.users[userId]) {
          userTweets.addClass("keep");
        }
        else {
          // userTweets.addClass("lose");
          // userTweets.css("background-color", "#ffc");
          userTweets.remove();
        }
      });
      window.request = window.request || 0;
      window.queries = window.queries || [];
      window.inRequest = false;
      window.userRequests = window.userRequests || [];
      // Get list of all users in stream
      userList = $("#stream-items-id li").not(".tu").find("a.account-group").map(function () {
        return $(this).data("user-id");
      }).get();
      newUsers = arrayDiff(userList, Object.keys(window.users));
      // _.each(newUsers, function (userId) {
      newUsers.forEach(function (userId, index, array) {
        window.userRequests.push(userId);
        // if (!_.contains(window.queries, userId)) {
        if (window.queries.indexOf(userId) == -1) {
          window.queries.push(userId);
          let popupUrl = `https://twitter.com/i/profiles/popup?user_id=${userId}`;
          $.get({
            url: popupUrl,
            success: function (data) {
              let html = JSON.parse(data).html;
              let doc = $(html);
              let statsAnchor = doc.find("[data-element-term='follower_stats']");
              let followers = $(".ProfileCardStats-statValue", statsAnchor).data("count");
              window.users[userId] = followers;
              userTweets = $(`li:has([data-user-id="${userId}"])`);
              userTweets.addClass("tu");
              if (window.ceiling > followers) {
                // userTweets.addClass("keep");
              }
              else {
                // userTweets.addClass("lose");
                // userTweets.css("background-color", "#ffc");
                userTweets.remove();
              }
              window.bizzy = false;
            }
          }).fail(function () {
            console.log("failed AJAX request");
            // TODO: remove userId from window.queries
            window.queries = window.queries.filter(function (x) {
              x !== userId;
            });
            window.bizzy = false;
          });
        }
      });
      window.bizzy = false;
    });
 }
 // Twitter extension idea: https://twitter.com/pookleblinky/status/959487077632135169
};

// create an observer instance
var observer = new MutationObserver(function(mutations) {

  var stream = $("#stream-items-id");
  var tweets = stream.children();

  // TODO: incorporate generalized version of "fade-*" options
  // into optionCallbacks schema above.

  // make promoted things stand out
  ["fade-tweet", "fade-account", "fade-trend"].forEach(function (category) {
    chrome.storage.local.get(category, function (setting) {
      if (Object.keys(setting).length == 0 || setting[category]) {
       var className = "."+category.replace("fade", "promoted");
       // set up fade in/out for when hovering promoted things
       $(className).fadeTo("fast", 0.2);
       $(className).hover(
	function () {
	 $(this).fadeTo("slow", 1.0);
	},
	function () {
	 $(this).fadeTo("slow", 0.2);
	}
       );
      }
    });
  });

  // Set up other turned-on features:
  Object.keys(optionCallbacks).forEach(function (optionID) {
    setupOption(optionID, optionCallbacks[optionID]);
  });

  // This creates a second search widget,
  // that delivers "latest" instead of "top" results:
  if ($("#hacked-nav-search").length == 0) {
   var searchForm = $("#global-nav-search").clone(false, true);
   searchForm.attr("id", "hacked-nav-search");
   searchForm.children(".search-input").attr("placeholder", "Search live tweets");
   searchForm.children("#search-query").attr("id", "hacked-query");
   var searchQuery = searchForm.children("#search-query");
   searchQuery.attr("id", "hacked-query");
   searchQuery.css("backgroundColor", "pink"); // why this not working?
   $("#global-nav-search").after(searchForm);

   searchForm.submit(function (event) {
     event.preventDefault();
     window.location.assign(`https://twitter.com/search?q=${encodeURIComponent($("#hacked-query").val())}&f=tweets`);
   });
  }

});


// configuration of the observer:
var config = { childList: true, subtree: true };

// pass in the target node, as well as the observer options
if (target) observer.observe(target, config);

// later, you can stop observing
// observer.disconnect();

