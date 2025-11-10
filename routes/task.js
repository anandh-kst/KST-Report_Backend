const express = require('express'); // Import Express
const reports = require('../controller/task'); // Import all exported functions from the task controller

const router = express.Router();

router.post('/createtask', reports.createtask);
router.post('/deleteTask/:id', reports.deleteTask);
router.post('/reportHistory/:employeeId',reports. getEmployeeReports);
router.post('/getTeamEmployeeReports/:tlid',reports. getTeamEmployeeReports);
router.post('/reportHistory_admin',reports. getAllEmployeeReports);
router.get("/:employeeId/task/:id",reports. getTaskById);



module.exports = router;
