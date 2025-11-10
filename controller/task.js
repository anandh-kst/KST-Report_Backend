const Task = require("../models/task");
const Sequelize = require("sequelize");
const {connection} = require("../dbConfig");

const Op = Sequelize.Op;
/* exports.createtask = async (req, res, next) => {
  const {
    id,
    employeeId,
    date,
    customer,
    task,
    estimatedTime,
    startTime,
    endTime,
    taskStatus,
    reasonForIncomplete,
    remarks,
    employeeName,
  } = req.body;

  try {
    const total = await Task.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today
          [Op.lt]: new Date(new Date().setHours(23, 59, 59, 999)), // End of today
        },
      },
    });

    if (id) {
      const [updated] = await Task.update(
        {
          date,
          employeeId,
          customer,
          task,
          estimatedTime,
          startTime,
          endTime,
          taskStatus,
          reasonForIncomplete,
          remarks,
          employeeName,
        },
        { where: { id } }
      );

      if (updated) {
        res.send({
          status: "Success",
          message: "Report updated successfully",
          data: { id },
        });
      } else {
        res
          .status(404)
          .send({ status: "Failure", message: "Report not found" });
      }
    } else {
      const report = await Task.create({
        date,
        employeeId,
        customer,
        task,
        estimatedTime,
        startTime,
        endTime,
        taskStatus,
        reasonForIncomplete,
        remarks,
        employeeName,
      });

      res.send({
        status: "Success",
        message: "Report saved successfully",
        data: { id: report.id },
      });
    }
  } catch (error) {
    next(error);
  }
}; */
exports.createtask = async (req, res, next) => {
  const {
    id,
    employeeId,
    date,
    customer,
    task,
    estimatedTime,
    startTime,
    endTime,
    taskStatus,
    reasonForIncomplete,
    remarks,
    employeeName,
    review,
    evaluation,
  } = req.body;

  try {
    if (id) {
      // Filter out undefined fields from the request body for the update
      const updateFields = {};
      Object.entries({
        date,
        employeeId,
        customer,
        task,
        estimatedTime,
        startTime,
        endTime,
        taskStatus,
        reasonForIncomplete,
        remarks,
        employeeName,
        review,
        evaluation,
      }).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields[key] = value;
        }
      });

      // Perform the update
      const [updated] = await Task.update(updateFields, { where: { id } });

      if (updated) {
        res.send({
          status: "Success",
          message: "Task updated successfully",
          data: { id },
        });
      } else {
        res.status(404).send({ status: "Failure", message: "Task not found" });
      }
    } else {
      // Create a new task
      const report = await Task.create({
        date,
        employeeId,
        customer,
        task,
        estimatedTime,
        startTime,
        endTime,
        taskStatus,
        reasonForIncomplete,
        remarks,
        employeeName,
        review,
        evaluation,
      });

      res.send({
        status: "Success",
        message: "Task created successfully",
        data: { id: report.id },
      });
    }
  } catch (error) {
    next(error);
  }
};
exports.deleteTask = async (req, res, next) => {
  const { id } = req.params; 
  try {
    const deleted = await Task.destroy({
      where: { id },
    });

    if (deleted) {
      res.send({
        status: "Success",
        message: "Task deleted successfully",
      });
    } else {
      res.status(404).send({
        status: "Failure",
        message: "Task not found",
      });
    }
  } catch (error) {
    next(error); 
  }
};

exports.getTaskById = async (req, res, next) => {
  const { employeeId, id } = req.params; // Get employeeId and id from route parameters

  try {
    // Find the specific task for the employee
    const report = await Task.findOne({
      where: {
        id,
        employeeId,
      },
    });

    if (report) {
      res.send({
        status: "Success",
        data: report,
      });
    } else {
      res.status(404).send({
        status: "Failure",
        message: "Report not found",
      });
    }
  } catch (error) {
    console.error("Error fetching task report:", error);
    next(error);
  }
};
exports.getEmployeeReports = async (req, res, next) => {
  const { domain, fromDate, toDate } = req.body;
  const page = parseInt(req.body.page) || 1; // Default to page 1
  const limit = parseInt(req.body.limit) || 10; // Default to limit of 10
  const offset = (page - 1) * limit; // Calculate offset for pagination
  const employeeId = req.params.employeeId; // Get employeeId from route parameters

  console.log("Request Body:", req.body);
  console.log("Employee ID:", employeeId);
  console.log("From Date:", new Date(fromDate));
  console.log("To Date:", new Date(toDate));

  try {
    // Fetch reports for the specific employee
    const reports = await Task.findAll({
      where: {
        employeeId,
        date: {
          [Op.between]: [new Date(fromDate), new Date(toDate)],
        },
        ...(domain && { domain }),
      },
      limit,
      offset,
      order: [["createdAt", "DESC"]], // Order by creation date
    });

    // Log the results
    console.log("Reports found:", reports);

    // Get total count for pagination
    const totalCount = await Task.count({
      where: {
        employeeId,
        date: {
          [Op.between]: [new Date(fromDate), new Date(toDate)],
        },
        ...(domain && { domain }),
      },
    });

    res.send({
      status: "Success",
      totalRecords: totalCount,
      page,
      limit,
      data: reports,
    });
  } catch (error) {
    console.error("Error fetching employee reports:", error);
    next(error);
  }
};
exports.getTeamEmployeeReports = async (req, res, next) => {
  const { fromDate, toDate } = req.body; // Destructure the date range from the request body
  const page = parseInt(req.body.page) || 1; // Default to page 1
  const limit = parseInt(req.body.limit) || 10; // Default to limit of 10
  const offset = (page - 1) * limit; // Calculate offset for pagination
  const tlId = req.params.tlid; // Get TL ID from route parameters

  try {
    // Step 1: Fetch all employees managed by the TL ID
    const [managedEmployees] = await connection.execute(
      'SELECT employeeId FROM tbl_tl_managed_employees WHERE tl_id = ?',
      [tlId]
    );

    // Step 2: Extract employee IDs from the result
    const employeeIds = managedEmployees
    .map(emp => emp.employeeId.split(',').map(id => id.trim()))
    .flat(); // Flatten the array
      
    // If no employees are managed, return an appropriate response
    if (employeeIds.length === 0) {
      return res.status(404).json({ error: 'No employees managed by this TL.' });
    }

    // Step 3: Fetch reports for the managed employees
    const reports = await Task.findAll({
      where: {
        employeeId: {
          [Op.in]: employeeIds, // Use IN clause to fetch reports for all managed employee IDs
        },
        date: {
          [Op.between]: [new Date(fromDate), new Date(toDate)],
        },
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']], // Order by creation date
    });

    // Log the results
    console.log("Reports found:", reports);

    // Get total count for pagination
    const totalCount = await Task.count({
      where: {
        employeeId: {
          [Op.in]: employeeIds,
        },
        date: {
          [Op.between]: [new Date(fromDate), new Date(toDate)],
        },
      },
    });

    // Respond with the results
    res.send({
      status: "Success",
      totalRecords: totalCount,
      page,
      limit,
      data: reports,
    });
  } catch (error) {
    console.error("Error fetching employee reports:", error);
    next(error);
  }
};


exports.getAllEmployeeReports = async (req, res, next) => {
  const { domain, fromDate, toDate } = req.body;
  const page = parseInt(req.body.page) || 1; // Default to page 1
  const limit = parseInt(req.body.limit) || 10; // Default to limit of 10
  const offset = (page - 1) * limit; // Calculate offset for pagination

  console.log("Admin Fetch Request - Body:", req.body);
  console.log("From Date:", new Date(fromDate));
  console.log("To Date:", new Date(toDate));

  try {
    // Fetch all reports for the specified date range (for all employees)
    const reports = await Task.findAll({
      where: {
        date: {
          [Op.between]: [new Date(fromDate), new Date(toDate)],
        },
        ...(domain && { domain }), // Optional domain filtering if provided
      },
      limit,
      offset,
      order: [["createdAt", "DESC"]], // Order by creation date
    });

    // Log the results
    console.log("Reports found:", reports);

    // Get total count for pagination
    const totalCount = await Task.count({
      where: {
        date: {
          [Op.between]: [new Date(fromDate), new Date(toDate)],
        },
        ...(domain && { domain }), // Optional domain filtering if provided
      },
    });

    // Send response with pagination and data
    res.send({
      status: "Success",
      totalRecords: totalCount,
      page,
      limit,
      data: reports,
    });
  } catch (error) {
    console.error("Error fetching all employee reports:", error);
    next(error);
  }
};
