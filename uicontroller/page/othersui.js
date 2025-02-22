const { getAppUrl } = require('../../utilityclient/url');

function errorUi(req, res) {
    res.render('pages/error.ejs', {
        appURL: getAppUrl()
    })
}

function contactUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/contact.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        breadCrumbs: [
            {name:'Home', link:getAppUrl('home')},
            {name:'Pages', link:''},
            {name:'Contact', link:''},
        ]
    })
}

function faqUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/faq.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        breadCrumbs: [
            {name:'Home', link:getAppUrl('home')},
            {name:'Pages', link:''},
            {name:'Frequently Asked Questions', link:''},
        ]
    })
}

module.exports = (app) => {
    app.get('/error', errorUi)
    app.get('/contact', contactUi)
    app.get('/faq', faqUi)
}