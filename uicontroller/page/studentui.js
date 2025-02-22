const { getAppUrl } = require('../../utilityclient/url');

function studentPageUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/student/studentlist.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        breadCrumbs: [
            {name:'Home', link:getAppUrl('home')},
            {name:'Student', link:''}
        ]
    });
}

function addStudentUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/student/studentform.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        studentId: '',
        breadCrumbs: [
            {name:'Home', link:getAppUrl('home')},
            {name:'Student', link:getAppUrl('student')},
            {name:'Add', link:''}
        ]
    });
}

function editStudentUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    const studentId = req.params.studentId;
    res.render('pages/student/studentform.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        studentId: studentId,
        breadCrumbs: [
            {name:'Home', link:getAppUrl('home')},
            {name:'Student', link:getAppUrl('student')},
            {name:'Edit', link:''}
        ]
    });
}

module.exports = (app) => {
    app.get('/student', studentPageUi)
    app.get('/student/add', addStudentUi)
    app.get('/student/:studentId', editStudentUi)
}
