const { getStudentAppUrl } = require('../../utilityclient/url');

function studentGenerateOtp(req, res) {
    res.render('pages/studentlogin.ejs', {
        studentAppURL: getStudentAppUrl()
    })
}

function getStudentReportUi(req, res) {
    const studentName = req.session.studentInfo.name;
    const studentRegNo = req.session.studentInfo.regNo;
    const studentId = req.session.studentInfo.studentId;

    if (req.session.isLoggedStudent === true) {
        res.render('pages/studentuse/report.ejs', {
            studentId: studentId,
            studentAppURL: getStudentAppUrl(),
            studentName: studentName,
            studentRegNo: studentRegNo,
            breadCrumbs : [ 
                {name:'Home', link:getStudentAppUrl('student/attendance/report')},
                {name:'AttendanceReport', link:''},
            ]
        })
    }
}

function studentDetailsUi(req, res) {
    const studentId = req.session.studentInfo.studentId;
    res.render('pages/studentuse/studentdetails.ejs',{
        studentId: studentId,
        studentAppURL: getStudentAppUrl(),
        breadCrumbs : [ 
            {name:'Pages', link:'javascript:void(0)'},
            {name:'User', link:getStudentAppUrl('student/details')},
        ]
    })
}

function studentLogOut(req, res) {
    res.render('pages/studentlogin.ejs', {
        studentAppURL: getStudentAppUrl()
    })
}

module.exports = (app) => {
    app.get('/student/login', studentGenerateOtp)
    app.get('/student/attendance/report', getStudentReportUi)
    app.get('/student/details', studentDetailsUi)
    app.get('/api/student/logout', studentLogOut)
}
