const express =require("express");
const router =express.Router();

const reports =require("../controller/report");

router.post('/forgotPassword',reports.forgotPassword);
router.post('/verifyOtp',reports.verifyOtp);
router.post('/resetPassword',reports.resetPassword);

router.post('/login',reports.login);
router.post('/appId',reports.appId);
router.post('/locationId/:projectId',reports.locationId);
router.post('/get_id_report/:employeeId',reports.idReportDetails);
router.post('/post_id_report',reports.createIdReport);
router.post('/deleteIdReport/:id',reports.deleteIdReport);
router.post('/get_report_details/:employeeId',reports.reportDetails);
router.post('/get_projects_list/:employeeId',reports.projectDetails);
router.post('/get_projects_list',reports.projectDetails);
router.post('/reportHistory/:employeeId',reports.reportHistory);

router.post('/reportHistory_tl/:tlId',reports.reportHistory_tl);
router.post('/tl_managed_employees',reports.tl_managed_employees);

router.post('/getIdReportById/:employeeId/:id', reports.getIdReportById);

router.get('/report', (req, resp) => {
    resp.send("hello report");
  });


router.post('/post_emp_report',reports.createReport);
router.post('/deleteReport/:id',reports.deleteReport);
router.put('/changePassword',reports.changePassword);
//router.get('/protectedRoute',reports.verifyToken);


module.exports = router;