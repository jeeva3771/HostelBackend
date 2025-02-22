const { getAppUrl } = require('../../utilityclient/url')

function coursePageUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.status(200).render('pages/course/courselist.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        breadCrumbs: [
            {name:'Home', link:getAppUrl('home')},
            {name:'Others', link:''},
            {name:'Course', link:''},
        ]
    });
}

function addCourseUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/course/courseform.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        courseId: '',
        breadCrumbs: [
            {name:'Home', link:getAppUrl('home')},
            {name:'Others', link:''},
            {name:'Course', link:getAppUrl('course')},
            {name:'Add', link:''}
        ]
    })
}

function editCourseUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    const courseId = req.params.courseId;
    res.render('pages/course/courseform.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        courseId: courseId,
        breadCrumbs: [
            {name:'Home', link:getAppUrl('home')},
            {name:'Others', link:''},
            {name:'Course', link:getAppUrl('course')},
            {name:'Edit', link:''}
        ]
    });
}

module.exports = (app) => {
    app.get('/course', coursePageUi)
    app.get('/course/add', addCourseUi)
    app.get('/course/:courseId', editCourseUi)
}
