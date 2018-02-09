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

function processNextTweet() {
  let newTweets = $("li").not(".tu").has("a.account-group");
  if (newTweets.length) {
    console.log(`${newTweets.length} new tweets`);
    let firstNewTweet = newTweets.first();
    let accountGroup = firstNewTweet.find("a.account-group");
    if (accountGroup) {
      let userId = accountGroup.data("user-id");
      if (userId) { // if no userId we're probably not looking at a tweet
        let followers = window.users[userId];
        if (followers) { // we already know this user's follower count
          let keep = (followers < window.ceiling);
          let userTweets = $("li").not(".tu").has(`[data-user-id="${userId}"]`);
          userTweets.addClass(keep ? "keep" : "lose").addClass("tu");
          processNextTweet();
        }
        else { // do request to find out user's follower count
          let popupUrl = `https://twitter.com/i/profiles/popup?user_id=${userId}`;
          $.get({
            url: popupUrl,
            success: function (data) {
              // console.log(JSON.stringify(data));
              let html = JSON.parse(data).html;
              // console.log(`${html.slice(0,10)}...${html.slice(-10)}`);
              let doc = $(html);
              // console.log(doc.length);
              let statsAnchor = doc.find("[data-element-term='follower_stats']");
              let followers = $(".ProfileCardStats-statValue", statsAnchor).data("count");
              console.log(`${followers} followers`);
              window.users[userId] = followers;
              console.log(`up to ${Object.keys(window.users).length} users!`);
              userTweets = $(`li:has[data-user-id="${userId}"]`);
              userTweets.addClass("tu");
              if (window.ceiling > followers) {
                userTweets.addClass("keep");
              }
              else {
                userTweets.addClass("lose");
                userTweets.css("border", "10px solid green");
                $(`<p>${followers}</p>`).appendTo(accountGroup);
              }
              userTweets.data("followers", followers);
              processNextTweet();
            }
          }).fail(function () {
            console.log("failed AJAX request");
          });
        }
      }
    }
  }
}

// Process tweets that are new to this mutation
// Tweets from previous mutations should have been marked with class "tu"
function processNewTweets(streamItems) {      
  newStreamItems = streamItems.not(".tu");
  console.log(`newStreamItems.length: ${newStreamItems.length}`);
  if (newStreamItems.length) {
    let streamItem = newStreamItems.first();
    console.log(streamItem.attr("class"));
    // if (!streamItem.hasClass("copy-link-to-tweet")) {
    if (true) {
      let accountGroup = streamItem.find("a.account-group");
      // console.log(accountGroup.get(0).outerHTML);
      let userId = accountGroup.data("user-id");
      // console.log(`userId: ${userId}`);
      // if (userId) {
      if (true) {
        let popupUrl = `https://twitter.com/i/profiles/popup?user_id=${userId}`
        console.log(popupUrl);
        $.get({
          url: popupUrl,
          success: function (data) {
            // console.log(JSON.stringify(data));
            let html = JSON.parse(data).html;
            // console.log(`${html.slice(0,10)}...${html.slice(-10)}`);
            let doc = $(html);
            // console.log(doc.length);
            let statsAnchor = doc.find("[data-element-term='follower_stats']");
            let followers = $(".ProfileCardStats-statValue", statsAnchor).data("count");
            window.users[userId] = followers;
            userTweets = $(`li:has[data-user-id="${userId}"]`);
            userTweets.addClass("tu");
            userTweets.addClass(window.ceiling > followers ? "keep" : "lose");
            userTweets.data("followers", followers);
            processNewTweets(newStreamItems);
          }
        }).fail(function () {
          console.log("failed AJAX request");
        });
      }
    }
  }
}

optionCallbacks = {
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
    // console.log($(this).get(0).outerHTML);
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
  // console.log(`mediaElement: ${mediaElement.get(0).outerHTML}`);
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
    // console.log $(this).style.backgroundImage;
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
    /*
    $("[data-user-id]").each(function () {
      if ($(this).attr("data-user-id").length)
        console.log(`<${$(this).get(0).tagName}> element: class="${$(this).attr('class')}" data-user-id="${$(this).attr('data-user-id')}"`);
    });
    */
    chrome.storage.local.get("follower-ceiling", function (data) {
      window.ceiling = data["follower-ceiling"];
      // console.log(`window.ceiling: ${window.ceiling}`);
      window.users = window.users || {};
      window.request = window.request || 0;
      window.queries = window.queries || [];
      window.inRequest = false;
      console.log(`${_.keys(window.users).length} known users`);
      window.userRequests = window.userRequests || [];
      // Get list of all users in stream
      userList = $("#stream-items-id li a.account-group").map(function () {
        return $(this).data("user-id");
      }).get();
      // console.log(`_.keys(window.users): ${_.keys(window.users)}`);
      newUsers = _.difference(userList, _.keys(window.users));
      // console.log(JSON.stringify(newUsers));
      _.each(newUsers, function (userId) {
        window.userRequests.push(userId);
        if (!_.contains(window.queries, userId)) {
          window.queries.push(userId);
          let popupUrl = `https://twitter.com/i/profiles/popup?user_id=${userId}`;
          $.get({
            url: popupUrl,
            success: function (data) {
              console.log(`request ${window.request++} for ${userId}`);
              let html = JSON.parse(data).html;
              // console.log(`${html.slice(0,10)}...${html.slice(-10)}`);
              let doc = $(html);
              // console.log(doc.length);
              let statsAnchor = doc.find("[data-element-term='follower_stats']");
              let followers = $(".ProfileCardStats-statValue", statsAnchor).data("count");
              // console.log(`${followers} followers`);
              window.users[userId] = followers;
              // console.log(`up to ${Object.keys(window.users).length} users!`);
              userTweets = $(`li:has([data-user-id="${userId}"])`);
              userTweets.addClass("tu");
              if (window.ceiling > followers) {
                userTweets.addClass("keep");
              }
              else {
                userTweets.addClass("lose");
                userTweets.css("background-color", "#ffc");
              }
              userTweets.data("followers", followers);
            }
          }).fail(function () {
            console.log("failed AJAX request");
            // TODO: remove userId from window.queries
          });
        }
      });
      // processNextTweet();
    });
 }
 // Old:
 /*
 "prefer-small": function () { // h/t Chuck Baggett https://twitter.com/ChuckBaggett/status/958156853455843328
    chrome.storage.local.get("follower-ceiling", function (ceiling) {
      console.log(`ceiling: ${JSON.stringify(ceiling)}`);
      window.users = window.users || {};
      $(".stream-item").each(function () {
        let streamItem = $(this);
        let accountGroup = streamItem.find("a.account-group");
        let userId = accountGroup.data("user-id");
        if (userId && !window.users[userId]) {
          let popupUrl = `https://twitter.com/i/profiles/popup?user_id=${userId}`
          $.get({
            url: popupUrl,
            success: function (data) {
              let html = JSON.parse(data).html;
              let doc = $(html);
              let statsAnchor = doc.find("[data-element-term='follower_stats']");
              let followers = $(".ProfileCardStats-statValue", statsAnchor).data("count");
              window.users[userId] = followers;
              if (followers > Number(ceiling["follower-ceiling"])) {
                streamItem.hide();
              }
              streamItem.data("followers", followers);
            }
          });
        }
      });
    });
 }
*/
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

