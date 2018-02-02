// Content script for Twitter lists
// Works in Chrome, not Firefox

// console.log(`list.js checking in`);



function doctorPage() {

  var currentUser = $(".current-user").find(".account-summary").attr("href").slice(1);
  var listAuthorElement = $(".list-author");
  if (listAuthorElement.length) {
   var listAuthor = listAuthorElement.attr("href").slice(1);
  }

  if (currentUser == listAuthor) {
   var listDetails = $(".js-list-details");
   var listID = listDetails.data("list-id");
   var listName = listDetails.find(".js-list-name").text();
   var authToken = $("#authenticity_token").attr("value");

   $(".tweet-context")
    .closest(".tweet").find(".account-group").not(".touched").each(function () {
     $(this).addClass("touched");
     var userID = $(this).data("user-id");
     var referer = "https://twitter.com"+$(this).attr("href")
     var gadget = $("<a>");
     var userName = $(this).find(".username").find("b").text();
     gadget.text(`add ${userName} to ${listName}`);
     gadget.click(function () {
       var url = `https://twitter.com/i/${userID}/lists/${listID}/members`;

       // Doing AJAX the straight-up Javascript way b/c someone said it's more
       // likely to get past CSP's.
       //  No luck so far w. Firefox.  Works w. Chromium.
       var oReq = new XMLHttpRequest();
       oReq.addEventListener("load", function () {
	 alert(`added ${userName} to ${listName}`);
       });
       oReq.open("POST", url);
       // oReq.setRequestHeader("Origin", "https://twitter.com");
       var formData = new FormData();
       formData.append("authenticity_token", authToken);

// This feature appears not to be implemented in Firefox yet.
/*
       var listener = chrome.webRequest.onBeforeSendHeaders.addListener(
        function (e) {
         for (var header of e.requestHeaders) {
          console.log(`encountered following header: {"${header.name}": "${header.value}"}`);
          if (header.name.match(/^referer$/i)) {
           console.log(`referer header found`);
          }
         }
         chrome.webRequest.onBeforeSendHeaders.removeListener(listener);
        },
        {urls: [url]}
       );
*/

       oReq.send(formData);

/*
       $.ajax({
	 accept: "application/json, text/javascript, ./*; q=0.01",
	 data: {authenticity_token: authToken},
	 error: function (jqXHR, textStatus, errorThrown) {
          alert(`FAIL\n${textStatus}\n${errorThrown}`);
         },
	 method: "POST",
	 success: function () { alert(`added ${userName} to ${listName}`);},
	 url: url
       });
*/
     });
     $(this).after(gadget);
   });
  };
}

// One iteration to get things started
// so we don't have to wait for the first mutation.
$(doctorPage);

// see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver#Example_usage

// select the target node
var target = document.querySelector("#page-container");

// create an observer instance
var observer = new MutationObserver(doctorPage);

// configuration of the observer:
var config = { childList: true, subtree: true };

// pass in the target node, as well as the observer options
if (target) observer.observe(target, config);

// later, you can stop observing
// observer.disconnect();

