const { connection, attendanceConnection } = require("../dbConfig");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.JWT_SECRET || "AJR";

const otpStore = {};

exports.changePassword = async (req, res, next) => {
  const { employeeId, oldPassword, newPassword } = req.body;

  try {
    if (!oldPassword || !newPassword) {
      return res.status(400).send({ status: "Error", message: "Missing old or new password" });
    }

    // Fetch the user's current hashed password from the database
    const sqlGetPassword = `SELECT password FROM tbl_userDetails WHERE employeeId = ?`;
    const [rows] = await attendanceConnection.execute(sqlGetPassword, [employeeId]);

    if (rows.length === 0) {
      return res.status(404).send({ status: "Error", message: "User not found" });
    }

    const currentHashedPassword = rows[0].password;

    // Hash the provided old password to compare with the stored one
    const hashedOldPassword = crypto.createHash("md5").update(oldPassword).digest("hex");

    // if (currentHashedPassword !== hashedOldPassword) {
    //   return res
    //     .status(400)
    //     .send({ status: "Error", message: "Incorrect old password" });
    // }

    // Hash the new password
    const hashedNewPassword = crypto.createHash("md5").update(newPassword).digest("hex");

    // Update the user's password in the database
    const sqlUpdatePassword = `UPDATE tbl_userDetails SET password = ? WHERE employeeId = ?`;
    await attendanceConnection.execute(sqlUpdatePassword, [hashedNewPassword, employeeId]);

    res.send({
      status: "Success",
      message: "Password has been changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  const { email, employeeId } = req.body;

  try {
    if (!email) {
      return res.status(400).send({ status: "Error", message: "Missing Email" });
    }

    // Check if user exists
    const sqlUser = `SELECT employeeId, email FROM tbl_userDetails WHERE isActive='1' AND email=?`;
    const [userResult] = await attendanceConnection.execute(sqlUser, [email]);

    if (userResult.length === 0) {
      return res.status(404).send({ status: "Error", message: "Email not found" });
    }

    const user = userResult[0];

    // Verify employeeId matches user
    /*  if (user.employeeId !== employeeId) {
      return res.status(403).send({ status: "Error", message: "Employee ID does not match the provided email" });
    } */

    // Generate OTP and expiration time
    const otp = crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
    const expiration = Date.now() + 300000; // 5 minutes in milliseconds

    // Store OTP in memory
    otpStore[employeeId] = { otp, expiration };

    // Configure nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "ajayarama9@gmail.com", // Replace with your email
        pass: "smqt kriq pbqt kcae", // Replace with your app password
      },
    });

    const mailOptions = {
      from: "ajayarama9@gmail.com",
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}`,
    };
    await transporter.sendMail(mailOptions);

    res.json({ message: "OTP sent successfully", employeeId: user.employeeId });
  } catch (error) {
    next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).send({ status: "Error", message: "Missing Email or OTP" });
    }

    const sqlVerifyOtp = `SELECT employeeId, expiration FROM tbl_passwordResetTokens WHERE token=? AND expiration > NOW()`;
    const [otpResult] = await connection.execute(sqlVerifyOtp, [otp]);

    if (otpResult.length === 0) {
      return res.status(400).send({ status: "Error", message: "Invalid or expired OTP" });
    }

    res.send({
      status: "Success",
      message: "OTP verified successfully. You can now reset your password.",
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  const { employeeId, otp, newPassword } = req.body;

  try {
    if (!otp || !newPassword) {
      return res.status(400).send({ status: "Error", message: "Missing OTP or Password" });
    }

    const otpEntry = otpStore[employeeId];
    if (!otpEntry) {
      return res.status(400).send({ status: "Error", message: "Invalid or expired OTP" });
    }

    if (Date.now() > otpEntry.expiration) {
      delete otpStore[employeeId]; // Clean up expired OTP
      return res.status(400).send({ status: "Error", message: "OTP expired" });
    }

    // Check if OTP matches
    if (otp !== otpEntry.otp) {
      return res.status(400).send({ status: "Error", message: "Invalid OTP" });
    }

    // Update the user's password (assuming you have a hashing function)
    const hashedPassword = crypto.createHash("md5").update(newPassword).digest("hex"); // Hashing the new password
    const sqlUpdatePassword = `UPDATE tbl_userDetails SET password=? WHERE employeeId=?`;
    await attendanceConnection.execute(sqlUpdatePassword, [hashedPassword, employeeId]);

    // Clean up the used OTP
    delete otpStore[employeeId];

    res.send({
      status: "Success",
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* exports.login = async (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  try {
    if (!username || !password) {
      return res.status(400).send({ status: "Error", message: "Missing Credentials" });
    }

    // Check if the username exists
    let sql = `SELECT u.employeeId, u.name AS employeeName, u.userName, u.userType, u.designation, 
                      u.mobileNumber, u.email, u.profileUrl, u.domain, u.password, t.tl_id 
               FROM tbl_userDetails u 
               LEFT JOIN tbl_tl_managed_employees t ON u.employeeId = t.tl_id
               WHERE u.isActive='1' AND BINARY u.userName = ?`;

    const [userResult] = await connection.execute(sql, [username]);

    if (userResult.length === 0) {
      return res.status(404).send({ status: "Error", message: "Invalid Username" });
    }

    // Check the password
    const sqlPasswordCheck = `SELECT u.employeeId, u.name AS employeeName, u.userName, u.userType, u.designation, 
                                     u.mobileNumber, u.email, u.profileUrl, u.domain, t.tl_id 
                              FROM tbl_userDetails u
                              LEFT JOIN tbl_tl_managed_employees t ON u.employeeId = t.tl_id
                              WHERE u.isActive='1' 
                              AND BINARY u.userName = ? 
                              AND u.password = MD5(?)`;

    const [loginResult] = await connection.execute(sqlPasswordCheck, [username, password]);

    if (loginResult.length === 0) {
      return res.status(401).send({ status: "Error", message: "Incorrect Password" });
    }

    const userData = loginResult[0];

    // Fetch managed employees if the user is a Team Leader
    let managedEmployees = [];
    if (userData.tl_id) {
      const managedEmployeesSql = `SELECT u.employeeId, u.name AS employeeName 
                                   FROM tbl_userDetails u 
                                   JOIN tbl_tl_managed_employees m ON u.employeeId = m.employeeId 
                                   WHERE m.tl_id = ?`;
      const [employeesResult] = await connection.execute(managedEmployeesSql, [userData.tl_id]);
      managedEmployees = employeesResult;
    }

    userData.managedEmployees = managedEmployees;

    // Generate a JWT token
    const token = jwt.sign(
      { employeeId: userData.employeeId, userType: userData.userType },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.send({ status: "Success", data: { user: userData, token } });

  } catch (error) {
    next(error);
  }
}; */

exports.login = async (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  try {
    if (!username || !password) {
      return res.status(400).send({ status: "Error", message: "Missing Credentials" });
    }

    // Step 1: Check if the username exists in attendanceConnection
    let sql = `
      SELECT 
        u.employeeId, u.name AS employeeName, u.userName, u.userType, 
        u.designation, u.mobileNumber, u.email, u.profileUrl, 
        u.domain, u.password 
      FROM attendance_register.tbl_userDetails u 
      WHERE u.isActive = '1' AND BINARY u.userName = ?
    `;

    const [userResult] = await attendanceConnection.execute(sql, [username]);

    if (userResult.length === 0) {
      // If username is invalid
      return res.status(404).send({ status: "Error", message: "Invalid Username" });
    }

    // Step 2: If username is valid, check the password
    const sqlPasswordCheck = `
      SELECT 
        u.employeeId, u.name AS employeeName, u.userName, u.userType, 
        u.designation, u.mobileNumber, u.email, u.profileUrl, 
        u.domain 
      FROM attendance_register.tbl_userDetails u
      WHERE u.isActive = '1' 
        AND BINARY u.userName = ? 
        AND u.password = MD5(?)
    `;

    const [loginResult] = await attendanceConnection.execute(sqlPasswordCheck, [username, password]);

    if (loginResult.length === 0) {
      // If password is incorrect but username is valid
      return res.status(401).send({ status: "Error", message: "Incorrect Password" });
    }

    const userData = loginResult[0];

    // Step 3: Check if the user is a Team Leader and fetch managed employees (if tl_id exists)
    let managedEmployees = [];
    if (userData.userType === "TeamLeader") {
      const managedEmployeesSql = `
        SELECT 
          u.employeeId, u.name AS employeeName 
        FROM attendance_register.tbl_userDetails u 
        JOIN connection.tbl_tl_managed_employees m ON u.employeeId = m.employeeId 
        WHERE m.tl_id = ?
      `;

      const [employeesResult] = await connection.execute(managedEmployeesSql, [userData.employeeId]);
      managedEmployees = employeesResult;
    }

    // Add managed employees to the user data (if any)
    userData.managedEmployees = managedEmployees;
    // Step 4: If both username and password are correct, send the user data with managed employees (if any)
    res.send({ status: "Success", data: userData });
  } catch (error) {
    next(error);
  }
};

/* exports.verifyToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Expecting "Bearer <token>"

  // Check if token is provided
  if (!token) {
    return res.status(401).send({ status: "Error", message: "Access Denied. No token provided." });
  }

  // Verify the token
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      // If token is invalid or expired
      return res.status(403).send({ status: "Error", message: "Invalid token." });
    }

    // Save decoded data to request for use in other routes
    req.user = decoded;

    // Respond directly from here
    res.send({ status: "Success", message: "This is a protected route.", user: req.user });
  });
}; */

exports.projectDetails = async (req, res, next) => {
  try {
    if (req.params.employeeId) {
      const sql = `select project as projectName,subProject as subCategory,contact_details,clientname,projectdomain,platform from tbl_employee_project_map a join tbl_projects b on a.projectId=b.id where employeeId="${req.params.employeeId}" AND a.isActive='1' AND b.isActive='1'`;
      const [result] = await connection.execute(sql);

      res.send({ status: "Success", data: result });
    } else {
      const sql = `SELECT id,project as projectName,subProject as subCategory,isActive,contact_details as contactDetails,clientname,projectdomain,platform FROM attendance_register.tbl_projects where isActive='1'`;
      const [result] = await connection.execute(sql);

      res.send({ status: "Success", data: result });
    }
  } catch (error) {
    next(error);
  }
};

exports.reportDetails = async (req, res, next) => {
  try {
    const currentDate = new Date().toISOString().split("T")[0];
    const sql = `
  SELECT id,employeeId,reportDetails,seletedProjectList,subCategoryList,DATE_FORMAT(reportDate, '%Y-%m-%d') as reportDate 
  FROM tbl_emp_reports 
  ${req.params.employeeId != 0 ? "WHERE employeeId = ? AND reportDate = ? AND isActive='1'" : "WHERE reportDate = ? AND isActive='1'"} 
  ORDER BY reportDate DESC`;

    const params = req.params.employeeId != 0 ? [req.params.employeeId, currentDate] : [currentDate];

    // if (req.params.employeeId == 0) {
    //   sql = `SELECT * FROM tbl_emp_reports`;
    // } else {
    //   sql = `SELECT * FROM tbl_emp_reports WHERE employeeId=${req.params.employeeId}`;
    // }
    const [result] = await connection.execute(sql, params);
    res.send({ status: "Success", data: result });
  } catch (error) {
    next(error);
  }
};

exports.idReportDetails = async (req, res, next) => {
  try {
    const currentDate = new Date().toISOString().split("T")[0];
    console.log(currentDate);
    let sql;
    if (req.params.employeeId == 0) {
      sql = `SELECT id,employeeId,application,location,DATE_FORMAT(receivedDate, '%Y-%m-%d') as receivedDate,regNo,noOfForms,scanning,typing,photoshop,coraldraw,underPrinting,toBeDelivered,delivered,remarks, DATE_FORMAT(reportDate, '%Y-%m-%d') as reportDate  FROM tbl_idcard_reports where isActive='1' AND DATE(reportDate) = "${currentDate}"`;
    } else {
      sql = `SELECT id,employeeId,application,location,DATE_FORMAT(receivedDate, '%Y-%m-%d') as receivedDate,regNo,noOfForms,scanning,typing,photoshop,coraldraw,underPrinting,toBeDelivered,delivered,remarks, DATE_FORMAT(reportDate, '%Y-%m-%d') as reportDate  FROM tbl_idcard_reports where isActive='1' AND DATE(reportDate) = "${currentDate}" AND employeeId="${req.params.employeeId}"`;
    }
    const [result] = await connection.execute(sql);
    res.send({ status: "Success", data: result });
  } catch (error) {
    next(error);
  }
};

exports.reportHistory = async (req, res, next) => {
  const { domain, fromDate, toDate, page = 1, limit = 10 } = req.body;
  const employeeId = req.params.employeeId;
  const offset = (page - 1) * limit;

  try {
    if (domain == "Development") {
      const sql = `
  SELECT id,employeeId,review,evaluation,reportDetails,seletedProjectList,subCategoryList,DATE_FORMAT(reportDate, '%d-%b-%Y') AS reportDate, DATE_FORMAT(created_at, '%h-%i %p') AS reportTime
  FROM tbl_emp_reports 
  WHERE isActive='1'  AND
    ${req.params.employeeId != 0 ? `employeeId = "${req.params.employeeId}" AND` : ""} 
    reportDate BETWEEN ${fromDate ? `"${fromDate}"` : "DATE_SUB(CURDATE(), INTERVAL 1 MONTH) "} AND ${toDate ? `"${toDate}"` : "CURDATE()"}
  ORDER BY reportDate DESC LIMIT ${limit} OFFSET ${offset}`;
      let countSql = `
SELECT COUNT(*) as total
FROM tbl_emp_reports 
WHERE isActive='1' AND
  ${req.params.employeeId != 0 ? `employeeId = "${req.params.employeeId}" AND` : ""} 
  reportDate BETWEEN ${fromDate ? `"${fromDate}"` : "DATE_SUB(CURDATE(), INTERVAL 1 MONTH) "} AND ${toDate ? `"${toDate}"` : "CURDATE()"}`;

      const [countResult] = await connection.execute(countSql);
      const totalRecords = countResult[0].total;
      const [result] = await connection.execute(sql);
      res.send({
        status: "Success",
        totalRecords,
        limit: limit,
        page: page,
        data: result,
      });
    } else {
      let sql = `
      SELECT 
        id, employeeId, application, location, receivedDate, regNo, 
        noOfForms, scanning, typing, photoshop, coraldraw, underPrinting,
        toBeDelivered, delivered, remarks, reportDate
      FROM tbl_idcard_reports
      WHERE isActive = '1' 
      ${employeeId != 0 ? "AND employeeId = ?" : ""}
      AND reportDate BETWEEN ${fromDate ? `"${fromDate}"` : "DATE_SUB(CURDATE(), INTERVAL 1 MONTH)"}
      AND ${toDate ? `"${toDate}"` : "CURDATE()"}
      ORDER BY reportDate ASC
    `;

      // Fetch the data from the database
      const [result] = await attendanceConnection.execute(sql, [employeeId]);

      // Group the data by reportDate
      const groupedData = result.reduce((acc, item) => {
        const reportDate = item.reportDate;

        // If the reportDate is not already a key, initialize it
        if (!acc[reportDate]) {
          acc[reportDate] = [];
        }

        // Push the item into the corresponding reportDate group
        acc[reportDate].push({
          id: item.id,
          employeeId: item.employeeId,
          application: item.application,
          location: item.location,
          receivedDate: item.receivedDate,
          regNo: item.regNo,
          noOfForms: item.noOfForms,
          scanning: item.scanning,
          typing: item.typing,
          photoshop: item.photoshop,
          coraldraw: item.coraldraw,
          underPrinting: item.underPrinting,
          toBeDelivered: item.toBeDelivered,
          delivered: item.delivered,
          remarks: item.remarks,
        });

        return acc;
      }, {});

      // Convert the grouped data into the final desired format
      const formattedData = Object.keys(groupedData).map((reportDate) => ({
        reportDate,
        reports: groupedData[reportDate],
      }));

      // Apply the limit and offset to the grouped data
      const start = (page - 1) * limit; // Calculate the starting index
      const end = start + limit; // Calculate the end index

      // Apply pagination on the final grouped data
      const paginatedData = formattedData.slice(start, end);

      // Send the response
      res.send({
        status: "Success",
        totalRecords: formattedData.length, // This can be the total number of reportDate groups
        limit,
        page,
        data: paginatedData,
      });
    }
    //      else {
    //       let sql = `SELECT id,employeeId,application,location,receivedDate,regNo,noOfForms,scanning,typing,photoshop,coraldraw,underPrinting,toBeDelivered,delivered,remarks
    //       ,DATE_FORMAT(reportDate, '%d-%b-%Y') AS reportDate FROM tbl_idcard_reports where isActive='1' AND ${
    //         req.params.employeeId != 0 ? "employeeId = ? AND" : ""
    //       }
    //       reportDate BETWEEN ${
    //         fromDate ? `"${fromDate}"` : "DATE_SUB(CURDATE(), INTERVAL 1 MONTH) "
    //       } AND ${toDate ? `"${toDate}"` : "CURDATE()"}
    //     ORDER BY reportDate DESC LIMIT ${limit} OFFSET ${offset}`;

    //       let countSql = `
    // SELECT COUNT(*) as total
    // FROM tbl_idcard_reports
    // WHERE isActive='1' AND
    //   ${req.params.employeeId != 0 ? " employeeId = ? AND" : ""}
    //   reportDate BETWEEN ${
    //     fromDate ? `"${fromDate}"` : "DATE_SUB(CURDATE(), INTERVAL 1 MONTH) "
    //   } AND ${toDate ? `"${toDate}"` : "CURDATE()"}
    // `;
    //       const [countResult] = await connection.execute(countSql, [
    //         req.params.employeeId,
    //       ]);
    //       const totalRecords = countResult[0].total;
    //       const params = [req.params.employeeId];
    //       const [result] = await connection.execute(sql, params);
    //       res.send({
    //         status: "Success",
    //         totalRecords,
    //         limit: limit,
    //         page: page,
    //         data: result,
    //       });
    //     }
  } catch (error) {
    next(error);
  }
};

exports.createReport = async (req, res, next) => {
  console.log(req.body);
  const { id, employeeId, reportDetails, subCategoryList, seletedProjectList, reportDate, review, evaluation } = req.body;

  try {
    const sql1 = `SELECT COUNT(*) AS total FROM tbl_emp_reports WHERE DATE(created_at) = CURDATE()`;
    const [total] = await connection.execute(sql1);
    console.log(total);

    const data = { employeeId, reportDetails, review };
    const reportDetailsString = reportDetails ? JSON.stringify(reportDetails) : null;
    const subCategoryListString = subCategoryList ? JSON.stringify(subCategoryList) : null;
    const seletedProjectListString = seletedProjectList ? JSON.stringify(seletedProjectList) : null;
    const reviewString = review ? JSON.stringify(review) : null;
    if (id) {
      // Dynamically build the `SET` clause
      const updates = [];
      const values = [];

      if (employeeId) {
        updates.push("employeeId = ?");
        values.push(employeeId);
      }
      if (reportDetailsString) {
        updates.push("reportDetails = ?");
        values.push(reportDetailsString);
      }
      if (subCategoryListString) {
        updates.push("subCategoryList = ?");
        values.push(subCategoryListString);
      }
      if (seletedProjectListString) {
        updates.push("seletedProjectList = ?");
        values.push(seletedProjectListString);
      }
      if (reportDate) {
        updates.push("reportDate = ?");
        values.push(reportDate);
      }
      if (review && Object.keys(review).length > 0) {
        updates.push("review = ?");
        values.push(review);
      }
      if (evaluation && Object.keys(evaluation).length > 0) {
        updates.push("evaluation = ?");
        values.push(evaluation);
      }

      // Ensure at least one field is being updated
      if (updates.length === 0) {
        return res.status(400).send({
          status: "Error",
          message: "No fields to update",
        });
      }

      // Add the `id` to the `WHERE` clause
      values.push(id);
      const sql = `UPDATE tbl_emp_reports SET ${updates.join(", ")} WHERE id = ?`;
      const [result] = await connection.execute(sql, values);

      data.id = id;
      console.log(`Updated report with ID: ${id}`);
    } else {
      // Handle insert scenario
      const sql = `INSERT INTO tbl_emp_reports (employeeId, reportDetails, subCategoryList, seletedProjectList, reportDate) 
                   VALUES (?, ?, ?, ?, ?)`;
      const [result] = await connection.execute(sql, [employeeId, reportDetailsString, subCategoryListString, seletedProjectListString, reportDate]);
      data.id = result.insertId;
      console.log(`Inserted report with ID: ${result.insertId}`);
    }

    res.send({ status: "Success", message: "Report saved successfully", data });
  } catch (error) {
    console.error("Error in createReport:", error);
    next(error);
  }
};
// exports.createReport = async (req, res, next) => {
//   console.log(req.body);
//   const { id, employeeId, reportDetails, subCategoryList, seletedProjectList, reportDate,/*  review, evaluation */ } = req.body;

//   try {
//     const sql1 = `SELECT COUNT(*) AS total FROM tbl_emp_reports WHERE DATE(created_at) = CURDATE()`;
//     const [total] = await connection.execute(sql1);
//     console.log(total);

//     const data = { employeeId, reportDetails, review };
//     const reportDetailsString = reportDetails ? JSON.stringify(reportDetails) : null;
//     const subCategoryListString = subCategoryList ? JSON.stringify(subCategoryList) : null;
//     const seletedProjectListString = seletedProjectList ? JSON.stringify(seletedProjectList) : null;
//     //const reviewString = review ? review : null;

//     if (id) {
//       // Dynamically build the `SET` clause
//       const updates = [];
//       const values = [];

//       if (employeeId) {
//         updates.push("employeeId = ?");
//         values.push(employeeId);
//       }
//       if (reportDetailsString) {
//         updates.push("reportDetails = ?");
//         values.push(reportDetailsString);
//       }
//       if (subCategoryListString) {
//         updates.push("subCategoryList = ?");
//         values.push(subCategoryListString);
//       }
//       if (seletedProjectListString) {
//         updates.push("seletedProjectList = ?");
//         values.push(seletedProjectListString);
//       }
//       if (reportDate) {
//         updates.push("reportDate = ?");
//         values.push(reportDate);
//       }
//      /*  if (review) {
//         updates.push("review = ?");
//         values.push(review);
//       }
//       if (evaluation) {
//         updates.push("evaluation = ?");
//         values.push(evaluation);
//       } */

//       // Ensure at least one field is being updated
//       if (updates.length === 0) {
//         return res.status(400).send({
//           status: "Error",
//           message: "No fields to update",
//         });
//       }

//       // Add the `id` to the `WHERE` clause
//       values.push(id);

//       const sql = `UPDATE tbl_emp_reports SET ${updates.join(", ")} WHERE id = ?`;
//       const [result] = await connection.execute(sql, values);

//       data.id = id;
//       console.log(`Updated report with ID: ${id}`);
//     } else {
//       // Handle insert scenario
//       const sql = `INSERT INTO tbl_emp_reports (employeeId, reportDetails, subCategoryList, seletedProjectList, reportDate,review, evaluation)
//                    VALUES (?, ?, ?, ?, ?,?,?)`;
//       const [result] = await connection.execute(sql, [
//         employeeId,
//         reportDetailsString,
//         subCategoryListString,
//         seletedProjectListString,
//         reportDate,
//        /*  review,
//         evaluation */
//       ]);
//       data.id = result.insertId;
//       console.log(`Inserted report with ID: ${result.insertId}`);
//     }

//     res.send({ status: "Success", message: "Report saved successfully", data });
//   } catch (error) {
//     console.error("Error in createReport:", error);
//     next(error);
//   }
// };

exports.createReportnew = async (req, res, next) => {
  console.log(req.body);
  const { id, employeeId, reportDetails, subCategoryList, selectedProjectList, reportDate, review } = req.body;

  try {
    const sql1 = `SELECT COUNT(*) AS total FROM tbl_emp_reports WHERE DATE(created_at) = CURDATE()`;
    const [total] = await connection.execute(sql1);
    console.log(total);

    const data = {
      employeeId,
      reportDetails,
      subCategoryList,
      selectedProjectList,
      reportDate,
      review,
    };

    if (id) {
      // Update existing report
      const sql = `
        UPDATE tbl_emp_reports 
        SET employeeId = ?, reportDetails = ?, subCategoryList = ?, selectedProjectList = ?, reportDate = ?, review = ? 
        WHERE id = ?`;
      const [result] = await connection.execute(sql, [employeeId, reportDetails, subCategoryList, selectedProjectList, reportDate, review, id]);
      data.id = id;
    } else {
      // Insert new report
      const sql = `
        INSERT INTO tbl_emp_reports (employeeId, reportDetails, subCategoryList, selectedProjectList, reportDate, review) 
        VALUES (?, ?, ?, ?, ?, ?)`;
      const [result] = await connection.execute(sql, [employeeId, reportDetails, subCategoryList, selectedProjectList, reportDate, review]);
      data.id = result.insertId;
      console.log(`Inserted report with ID: ${result.insertId}`);
    }

    res.send({
      status: "Success",
      message: "Report saved successfully",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

// Assuming you're using Express.js

exports.updateReview = async (req, res, next) => {
  const { review } = req.body;
  const { id } = req.params;

  try {
    const sql = `UPDATE tbl_emp_reports SET review = ? WHERE id = ?`;
    const [result] = await connection.execute(sql, [review, id]);

    if (result.affectedRows === 0) {
      throw new Error("Report not found");
    }

    res.send({ status: "Success", message: "Review updated successfully" });
  } catch (error) {
    next(error);
  }
};
exports.deleteReport = async (req, res, next) => {
  const { id } = req.params; // Get the id from the URL parameter

  if (!id) {
    return res.status(400).json({ status: "Error", message: "Report ID is required" });
  }

  try {
    const sql = "DELETE FROM tbl_emp_reports WHERE id = ?";
    const [result] = await connection.execute(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: "Error", message: "Report not found" });
    }

    res.status(200).json({ status: "Success", message: "Report deleted successfully" });
  } catch (error) {
    next(error);
  }
};

exports.createIdReport = async (req, res, next) => {
  console.log(req.body);
  const { id, employeeId, reportDate, application, location, receivedDate, regNo, noOfForms, scanning, typing, photoshop, coraldraw, underPrinting, toBeDelivered, delivered, remarks } = req.body;
  try {
    const sql1 = `select count(*) as total from tbl_idcard_reports where date(created_at)=curdate()`;
    const [total] = await attendanceConnection.execute(sql1);
    console.log(total);
    // if(total[0].total>1) throw "Already exists..."
    if (!id) {
      console.log(employeeId, reportDate, application, location, receivedDate, regNo, noOfForms, scanning, typing, photoshop, coraldraw, underPrinting, toBeDelivered, delivered, remarks);
      const sql = `INSERT INTO tbl_idcard_reports 
      (employeeId,reportDate, application, location, receivedDate, regNo, noOfForms, scanning, typing, photoshop, coraldraw, underPrinting, toBeDelivered, delivered, remarks) 
      VALUES
      (?,?,?, ?, ?, ?,  ?, ?,?,  ?, ?,?,  ?, ?,?)`;
      const [result] = await attendanceConnection.execute(sql, [employeeId, reportDate, application, location, receivedDate, regNo, noOfForms, scanning, typing, photoshop, coraldraw, underPrinting, toBeDelivered, delivered, remarks]);
      console.log(`Inserted report with ID: ${result.insertId}`);
      res.send({ status: "Success", message: "Report saved successfully" });
    } else {
      const sql = `UPDATE tbl_idcard_reports 
    SET 
      employeeId = ?, 
      reportDate = ?, 
      application = ?, 
      location = ?, 
      receivedDate = ?, 
      regNo = ?, 
      noOfForms = ?, 
      scanning = ?, 
      typing = ?, 
      photoshop = ?, 
      coraldraw = ?, 
      underPrinting = ?, 
      toBeDelivered = ?, 
      delivered = ?, 
      remarks = ?
    WHERE 
      id = ?`;
      const [result] = await attendanceConnection.execute(sql, [employeeId, reportDate, application, location, receivedDate, regNo, noOfForms, scanning, typing, photoshop, coraldraw, underPrinting, toBeDelivered, delivered, remarks, id]);
      res.send({ status: "Success", message: "Report update successfully" });
    }
  } catch (error) {
    next(error);
  }
};
exports.deleteIdReport = async (req, res, next) => {
  const { id } = req.params; // Get the id from the URL parameter
  try {
    // SQL query to delete the record based on the provided ID
    const sql = `DELETE FROM tbl_idcard_reports WHERE id = ?`;

    // Execute the query
    const [result] = await connection.execute(sql, [id]);

    // Check if any row was affected (deleted)
    if (result.affectedRows === 0) {
      return res.status(404).send({ status: "Error", message: "Report not found" });
    }

    // Send a success response if the record was deleted
    res.send({ status: "Success", message: "Report deleted successfully" });
  } catch (error) {
    next(error);
  }
};

exports.appId = async (req, res, next) => {
  try {
    let sql = `SELECT project FROM tbl_projects where idRef=1`;
    const [result] = await connection.execute(sql);
    let data = result.map((value, index) => value.project);
    res.send({ status: "Success", data });
  } catch (error) {
    next(error);
  }
};
exports.locationId = async (req, res, next) => {
  try {
    let sql = `SELECT location FROM tbl_location a join tbl_projects b on a.projectId=b.id where a.isActive='1' and b.isActive='1' and b.project='${req.params.projectId}'`;
    const [result] = await connection.execute(sql);
    let data = result.map((value, index) => value.location);
    res.send({ status: "Success", data });
  } catch (error) {
    next(error);
  }
};
exports.getIdReportById = async (req, res, next) => {
  const { id, employeeId } = req.params; // Get id and employeeId from request parameters

  try {
    const sql = `
      SELECT id, employeeId, reportDate, application, location, receivedDate, regNo, noOfForms, scanning, typing, photoshop, coraldraw, underPrinting, toBeDelivered, delivered, remarks 
      FROM tbl_idcard_reports 
      WHERE id = ? AND employeeId = ?
    `;

    const [result] = await connection.execute(sql, [id, employeeId]); // Use parameterized query for security

    if (result.length === 0) {
      res.status(404).send({ status: "Error", message: "Report not found" });
    } else {
      res.send({ status: "Success", data: result[0] });
    }
  } catch (error) {
    next(error);
  }
};

exports.reportHistory_tl = async (req, res, next) => {
  const { domain, fromDate, toDate } = req.body;
  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const { tlId } = req.params; // TL ID from request params

    // Step 1: Fetch employee IDs managed by the TL from connection database
    const employeesSql = `
      SELECT employeeId 
      FROM tbl_tl_managed_employees 
      WHERE tl_id = ?
    `;
    const [employeeResults] = await connection.execute(employeesSql, [tlId]);

    const employeeIds = employeeResults.flatMap((emp) => emp.employeeId.split(",").map((id) => id.trim())).filter((id) => id);

    if (employeeIds.length === 0) {
      return res.status(404).json({ error: "No employees found for the given TL ID." });
    }

    const placeholders = employeeIds.map(() => "?").join(", ");

    if (domain === "Development") {
      // Step 2: Query Development reports
      const sql = `
        SELECT 
          r.id, r.employeeId, r.reportDetails, r.seletedProjectList, r.subCategoryList,
          DATE_FORMAT(r.reportDate, '%d-%b-%Y') AS reportDate, u.name AS name
        FROM tbl_emp_reports r
        INNER JOIN attendance_register.tbl_userdetails u ON r.employeeId = u.employeeId
        WHERE r.isActive = '1' 
          AND r.employeeId IN (${placeholders}) 
          AND r.reportDate BETWEEN ${fromDate ? `"${fromDate}"` : "DATE_SUB(CURDATE(), INTERVAL 1 MONTH)"} 
          AND ${toDate ? `"${toDate}"` : "CURDATE()"}
        ORDER BY r.reportDate DESC 
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) AS total
        FROM tbl_emp_reports r
        INNER JOIN attendance_register.tbl_userdetails u ON r.employeeId = u.employeeId
        WHERE r.isActive = '1' 
          AND r.employeeId IN (${placeholders}) 
          AND r.reportDate BETWEEN ${fromDate ? `"${fromDate}"` : "DATE_SUB(CURDATE(), INTERVAL 1 MONTH)"} 
          AND ${toDate ? `"${toDate}"` : "CURDATE()"}
      `;

      const [countResult] = await connection.execute(countSql, employeeIds);
      const totalRecords = countResult[0].total;
      const [result] = await connection.execute(sql, employeeIds);

      res.send({ status: "Success", totalRecords, limit, page, data: result });
    } else {
      // Step 3: Query non-Development reports
      const sql = `
        SELECT 
          r.id, r.employeeId, r.application, r.location, r.receivedDate, r.regNo, r.noOfForms,
          r.scanning, r.typing, r.photoshop, r.coraldraw, r.underPrinting, 
          r.toBeDelivered, r.delivered, r.remarks,
          DATE_FORMAT(r.reportDate, '%d-%b-%Y') AS reportDate, u.name AS name
        FROM report.tbl_idcard_reports r
        INNER JOIN attendance_register.tbl_userdetails u ON r.employeeId = u.employeeId
        WHERE r.isActive = '1' 
          AND r.employeeId IN (${placeholders}) 
          AND r.reportDate BETWEEN ${fromDate ? `"${fromDate}"` : "DATE_SUB(CURDATE(), INTERVAL 1 MONTH)"} 
          AND ${toDate ? `"${toDate}"` : "CURDATE()"}
        ORDER BY r.reportDate DESC 
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) AS total
        FROM tbl_idcard_reports r
        INNER JOIN attendance_register.tbl_userdetails u ON r.employeeId = u.employeeId
        WHERE r.isActive = '1' 
          AND r.employeeId IN (${placeholders}) 
          AND r.reportDate BETWEEN ${fromDate ? `"${fromDate}"` : "DATE_SUB(CURDATE(), INTERVAL 1 MONTH)"} 
          AND ${toDate ? `"${toDate}"` : "CURDATE()"}
      `;

      const [countResult] = await connection.execute(countSql, employeeIds);
      const totalRecords = countResult[0].total;
      const [result] = await connection.execute(sql, employeeIds);

      res.send({ status: "Success", totalRecords, limit, page, data: result });
    }
  } catch (error) {
    next(error);
  }
};

exports.tl_managed_employees = async (req, res, next) => {
  const { tl_id, employeeId } = req.body; // Destructure tl_id and employeeId from the request body

  try {
    // Step 1: Check if all employee IDs exist in the user details table
    const placeholders = employeeId.map(() => "?").join(", ");
    const checkSql = `SELECT COUNT(*) AS count FROM tbl_userdetails WHERE employeeId IN (${placeholders})`;
    const [results] = await attendanceConnection.execute(checkSql, employeeId);

    const count = results[0].count;

    // Step 2: If count is not equal to the length of employeeId array, it means one or more IDs do not exist
    if (count !== employeeId.length) {
      return res.status(400).json({ error: "One or more Employee IDs do not exist." });
    }

    // Step 3: Concatenate the employee IDs into a single string
    const employeeIdString = employeeId.join(", "); // Join with a comma or any delimiter you prefer

    // Step 4: Insert the TL ID and concatenated employee IDs into the database
    const sql = "INSERT INTO tbl_tl_managed_employees (tl_id, employeeId) VALUES (?, ?)";
    const [result] = await connection.execute(sql, [tl_id, employeeIdString]);

    res.status(201).json({ message: "Employees managed successfully", id: result.insertId });
  } catch (error) {
    next(error);
  }
};
