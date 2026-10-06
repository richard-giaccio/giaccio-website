/**
 * Google Apps Script — email full contact-form details on every submission.
 * STANDALONE project version (you created the project directly, not from the form).
 *
 * SETUP (3 steps, in the editor you already have open):
 *   1. Delete the default code, paste everything in this file, click Save (disk icon).
 *   2. In the function dropdown at the top, choose "installTrigger", then click Run.
 *   3. A permission prompt appears -> Review permissions -> choose pavannchow@gmail.com
 *      -> Advanced -> "Go to <project> (unsafe)" -> Allow.
 *      (That "unsafe" warning is normal for your own unpublished script.)
 *
 * Done. Run it only once. Every new submission then emails the full
 * name/email/phone/property/message, with Reply-To set to the sender.
 */

var FORM_ID = '1YZhSMgl3F1wveNoc-OesFssi3_3IV1hhnqPW4oC8wfg';
var NOTIFY_TO = 'pavannchow@gmail.com'; // change to a business address if you want

// Run this ONCE to attach the handler to the form.
function installTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(FORM_ID)
    .onFormSubmit()
    .create();
}

function onFormSubmit(e) {
  var items = e.response.getItemResponses();
  var lines = [];
  var replyTo = null;

  for (var i = 0; i < items.length; i++) {
    var title = items[i].getItem().getTitle();
    var answer = items[i].getResponse();
    lines.push(title + ': ' + answer);
    if (title.toLowerCase().indexOf('email') > -1 && answer) {
      replyTo = answer;
    }
  }

  var body = 'New enquiry from the Giaccio Properties website contact form:\n\n' +
             lines.join('\n') +
             '\n\nReply to this email to respond to the sender directly.';

  var options = { name: 'Giaccio Properties Website' };
  if (replyTo) options.replyTo = replyTo;

  MailApp.sendEmail(NOTIFY_TO, 'New website enquiry — Giaccio Properties', body, options);
}
