

module.exports = {

    // send notification email via SendGrid
    // we do this independently here in case the Notification service is ever down
    sendNotificationEmail: function(sendGrid, config, content)
    {
        var message = 'Message from FCO Legalisation - Submission Queue Monitor on the ' + config.environment + ' environment:\n\n';

        var helper = require('sendgrid').mail;
        var mail = new helper.Mail();

        var email = new helper.Email("fco-submission-queue-monitor@get-document-legalised.service.gov.uk", "FCO Submission Queue Monitor");
        mail.setFrom(email);

        mail.setSubject("FCO Legalisation - Submission Queue Monitor (" + config.environment + ")");

        var personalization = new helper.Personalization();
        var recipients = config.subscribers;
        var recipientsArry = recipients.split(";");
        recipientsArry.forEach(function(value) {
            email = new helper.Email(value);
            personalization.addTo(email);
        });
        mail.addPersonalization(personalization);

        var body = new helper.Content("text/plain", message + content);
        mail.addContent(body);

        var sg = require('sendgrid').SendGrid(config.sendGridSettings.api_key);
        var requestBody = mail.toJSON();
        var request = sg.emptyRequest();
        request.method = 'POST';
        request.path = '/v3/mail/send';
        request.body = requestBody;
        sg.API(request, function (response) {
            console.info(response.statusCode);
            console.info(response.body);
            console.info(response.headers);
        });
    }
};