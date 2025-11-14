const express = require("express");
const router = express.Router();

const reports = require("../controller/admin");
const upload = require("../controller/admin"); // Import the multer middleware

router.post("/employee_list", reports.employee_list);
//router.post('/addEmployee', reports.addEmployee);
router.post(
  "/addEmployee",
  upload.upload.single("profileUrl"),
  reports.addEmployee
);
router.post(
  "/addEmployee1",
  upload.upload.single("profileUrl"),
  reports.addEmployee1
);
// router.post('/uploadProfileImage',reports.uploadProfileImage);
router.post("/getEmployeeById/:employeeId", reports.getEmployeeById);
router.post("/deleteEmployee/:id", reports.deleteEmployee);

router.post("/create_project", reports.create_project);
router.post("/delete_project", reports.delete_project);
router.post("/employee_project_list", reports.employee_list);
router.post("/reportHistory_admin", reports.reportHistory_admin);

router.post("/applyLeave", reports.applyLeave);
router.put("/updateLeaveStatus", reports.updateLeaveStatus);
router.post("/getLeaveApplications", reports.getLeaveApplications);
router.post("/getLeaveRequestsAll", reports.getLeaveRequestsAll);
router.post("/dailypunch", reports.dailypunch);
router.post("/dailypunch1", reports.dailypunch1);
router.post("/create_event", reports.create_event);
router.post("/getSinglePunch", reports.getSinglePunch);
router.post("/updateMultipleRefTimes", reports.updateMultipleRefTimes);
router.post("/updateOrInsertPunches", reports.updateOrInsertPunches);

router.post("/attendanceSummary", reports.attendanceSummary);
router.post("/attendanceDashboard", reports.attendanceDashboard);
router.get("/getAllEmployees", reports.getAllEmployees);
router.post("/addAsset", reports.addAsset);
router.get("/getAssets", reports.getAssets);
router.delete("/deleteAsset/:id", reports.deleteAsset);
router.put("/updateAsset/:id", reports.updateAsset);
router.get("/getAsset/:id", reports.getAsset);
router.post("/updateProfileImage/:id",upload.upload.single("profileUrl"),reports.updateProfileImage);

router.get("/generateEmployeeId", reports.generateEmployeeId);
router.get("/deactiveEmployees", reports.deactiveEmployees);
router.post("/resetPwd", reports.resetPwd);
router.get("/get_upcoming_holidays", reports.getHolidays);
router.post("/project_master", reports.project_master);
router.get("/get_Project_Master", reports.get_Project_Master);
router.get("/getAllHolidays", reports.getAllHolidays);
router.post("/project_assign", reports.project_assign);
router.post("/get_assigned_project", reports.get_assigned_project);
router.post("/delete_project_assign", reports.delete_project_assign);
router.post(
  "/getEmployeesWithMissingTasks",
  reports.getEmployeesWithMissingTasks
);
router.post("/deleteLeaveApplication", reports.deleteLeaveApplication);
router.post("/get_late_punch", reports.get_late_punch);
router.post("/get_fcmToken", reports.get_fcmToken);
router.post("/getAttendanceReport", reports.getAttendanceReport);
router.post("/get_save_rules", reports.get_save_rules);
router.post("/get_all_save_rules", reports.get_all_save_rules);
router.post("/post_save_rules", reports.post_save_rules);
router.post("/update_rule/:id", reports.update_rule);
router.post("/delete_rule/:id", reports.delete_rule);

router.get("/admin", (req, resp) => {
  resp.send("hello admin");
});

module.exports = router;
