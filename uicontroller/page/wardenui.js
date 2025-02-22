const { getAppUrl } = require('../../utilityclient/url');

function wardenPageUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    if (!req.session || !req.session.warden || req.session.warden.superAdmin !== 1) {
        return res.status(403).redirect('/error')
    } else {
        res.render('pages/warden/wardenlist.ejs', {
            appURL: getAppUrl(),
            avatarWardenId: avatarWardenId,
            breadCrumbs: [
                {name:'Home', link:getAppUrl('home')},
                {name:'Warden', link:''},
            ]
        });
    }
}

function addWardenUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    if (!req.session || !req.session.warden || req.session.warden.superAdmin !== 1) {
        return res.status(403).redirect('/error')
    } else {
        res.render('pages/warden/wardenform.ejs', {
            appURL: getAppUrl(),
            avatarWardenId: avatarWardenId,
            wardenId: '',
            breadCrumbs: [
                {name:'Home', link:getAppUrl('home')},
                {name:'Warden', link:getAppUrl('warden')},
                {name:'Add', link:''}
            ]
        });
    }
}

function editWardenUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    const wardenId = req.params.wardenId;
    if (!req.session || !req.session.warden || req.session.warden.superAdmin !== 1) {
        return res.status(403).redirect('/error')
    } else {
        res.render('pages/warden/wardenform.ejs', {
            appURL: getAppUrl(),
            wardenId: wardenId,
            avatarWardenId: avatarWardenId,
            breadCrumbs: [
                {name:'Home', link:getAppUrl('home')},
                {name:'Warden', link:getAppUrl('warden')},
                {name:'Edit', link:''}
            ]
        });
    }
}

function resetPasswordUi(req, res) {
    res.render('pages/resetpassword.ejs', {
        appURL: getAppUrl()
    })
}

function wardenDetailsUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/warden/wardendetails.ejs',{
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        breadCrumbs : [ 
            {name:'Home', link:getAppUrl('home')},
            {name:'User', link:getAppUrl('warden/details')},
            {name:'UserDetails', link:''}
        ]
    })
}

module.exports = (app) => {
    app.get('/warden/details', wardenDetailsUi)
    app.get('/warden/resetpassword', resetPasswordUi)
    app.get('/warden', wardenPageUi)
    app.get('/warden/add', addWardenUi)
    app.get('/warden/:wardenId', editWardenUi)
}
