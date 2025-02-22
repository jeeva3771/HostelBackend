const { getAppUrl, getStudentAppUrl } = require('../../utilityclient/url');

module.exports = (app) => {
    app.get('/login', (req, res) => {
        if (req.session.isLogged === true) {
            res.status(302).redirect(getAppUrl('home'))
        } else {
            res.render('pages/login', {
                appURL: getAppUrl(),
                studentAppURL: getStudentAppUrl()
            })
        }
    });

    app.get('/api/logout', (req, res) => {
        res.render('pages/login', {
            appURL: getAppUrl()
        })
    })

    app.get(['/home','/'], (req, res) => {
        const avatarWardenId = req.session.warden.wardenId;
        if (req.session.isLogged === true) {
            res.render('pages/home', {
                avatarWardenId: avatarWardenId,
                appURL: getAppUrl(),
                breadCrumbs: [
                    { name: 'Home', link: getAppUrl('home') },
                    { name: 'Dashboard', link: '' }
                ]
            })
        }
        else {
            res.status(302).redirect(getAppUrl('login'))
        }
    })
}
