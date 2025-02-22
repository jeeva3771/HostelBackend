const { getAppUrl } = require('../../utilityclient/url');

function attendancePageUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/attendance/attendancelist.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        breadCrumbs : [ 
            {name:'Home', link:getAppUrl('home')},
            {name:'Attendance', link:''}
        ]
        });
}

function addOrEditAttendanceUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/attendance/attendanceform.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        breadCrumbs : [ 
            {name:'Home', link:getAppUrl('home')},
            {name:'Attendance', link:''},
        ]
    });
}

function getAttendanceStudentReportUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/attendance/report.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        breadCrumbs : [ 
            {name:'Home', link:getAppUrl('home')},
            {name:'Attendance', link:getAppUrl('attendance')},
            {name:'Report', link:''}
        ]
    })
}

module.exports = (app) => {
    app.get('/attendance', attendancePageUi)
    app.get('/attendance/add', addOrEditAttendanceUi)
    app.get('/attendance/report', getAttendanceStudentReportUi)
}
