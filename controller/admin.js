const { error } = require("console");
const { connection, attendanceConnection } = require("../dbConfig");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const moment = require("moment-timezone"); // install this with: npm i moment-timezone

const hash = crypto.createHash("sha256"); // sha256 is the hashing algorithm
hash.update("some data to hash");
const hashedData = hash.digest("hex");
console.log(hashedData); // Output the hash

exports.employee_list = async (req, res, next) => {
  try {
    const sql = `Select *,name as employeeName from tbl_userDetails where isActive='1' and userType="employee" order by employeeId asc`;
    //const sql = `Select *,name as employeeName from tbl_userDetails where userType="employee" order by employeeId asc`;
    const [result] = await attendanceConnection.execute(sql);
    let projectDetails = [];
    for (let i = 0; i < result.length; i++) {
      //const sql1 = `select a.project,a.subProject from tbl_projects a join tbl_employee_project_map b on a.id=b.projectId where b.employeeId="${result[i].employeeId}"`;
      const sql1 = `select a.project,a.subProject from tbl_projects a join tbl_employee_project_map b on a.id=b.projectId where b.employeeId="${result[i].employeeId}" AND a.isActive='1' AND b.isActive='1'`;
      const [result1] = await connection.execute(sql1);
      const sql2 = `select project,subProject from tbl_projects where id not in (select a.id from tbl_projects a join tbl_employee_project_map b on a.id=b.projectId where employeeId="${result[i].employeeId}" AND a.isActive='1' AND b.isActive='1') AND isActive='1'`;
      //const sql2 = `select project,subProject from tbl_projects where id not in (select a.id from tbl_projects a join tbl_employee_project_map b on a.id=b.projectId where employeeId="${result[i].employeeId}" ) `;

      const [result2] = await connection.execute(sql2);

      const trueValue = result1.map((item) => [
        {
          projectName: item.project,
          subCategory: item.subProject,
          isActive: true,
        },
      ]);
      const falseValue = result2.map((item) => [
        {
          projectName: item.project,
          subCategory: item.subProject,
          isActive: false,
        },
      ]);
      const val = [...trueValue, ...falseValue].flat();
      result[i].projectDetails = val;
      projectDetails.push(result[i]);
    }
    res.send({ status: "Success", data: projectDetails.flat() });
  } catch (error) {
    next(error);
  }
};

// exports.employee_list = async (req, res, next) => {
//   try {
//     const sql = `Select *,name as employeeName from tbl_userDetails where isActive='1' and userType="employee" order by employeeId asc`;
//     const [result] = await attendanceConnection.execute(sql);
//     let projectDetails = []
//     for (let i = 0; i < result.length; i++) {
//       const sql1 = `select a.project,a.subProject from tbl_projects a join tbl_employee_project_map b on a.id=b.projectId where b.employeeId="${result[i].employeeId}" AND a.isActive='1' AND b.isActive='1'`;
//       const [result1] = await connection.execute(sql1);
//       const sql2 = `select project,subProject from tbl_projects where id not in (select a.id from tbl_projects a join tbl_employee_project_map b on a.id=b.projectId where employeeId="${result[i].employeeId}" AND a.isActive='1' AND b.isActive='1') AND isActive='1'`;
//       const [result2] = await connection.execute(sql2);

//       const trueValue = result1.map(item => [{ projectName: item.project, subCategory: item.subProject, "isActive": true }])
//       const falseValue = result2.map(item => [{ projectName: item.project, subCategory: item.subProject, "isActive": false }])
//       const val = [...trueValue, ...falseValue].flat()
//       result[i].projectDetails = val
//       projectDetails.push(result[i])
//     }
//     res.send({ status: "Success", data: projectDetails.flat() });
//   } catch (error) {
//     next(error);
//   }
// // };

// Define the multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/Images"); // Save uploaded file to the 'uploads/Images' folder
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    ); // Create a unique file name
  },
});

exports.upload = multer({ storage: storage }); // Initialize multer with the storage configuration

// Add Employee function (no need to use upload.single here, it's already in the route)
/* exports.addEmployee = async (req, res) => {
  const {
    employeeId, name, userName, password, userType, designation, domain, dateOfJoining,
    mobileNumber, mobileNumber2, email, email2, address, dateOfBirth,
    bankName, bankBranch, accountNo, ifscNo, salary
  } = req.body;

  try {
    // Check if a profile image was uploaded
    const profileUrlValue = req.file ? req.file.filename : '-';  // Use uploaded filename or default '-'

    const currentTime = new Date();

    // Check if the user already exists (by username)
    const checkUserSql = 'SELECT * FROM tbl_userdetails WHERE userName = ?';
    const [existingUser] = await attendanceConnection.execute(checkUserSql, [userName]);

    if (existingUser.length > 0) {
      // Update existing employee details
      const hashedPassword = crypto.createHash('md5').update(password).digest('hex');  // Hash password

      const sqlUpdate = `
        UPDATE tbl_userdetails
        SET name = ?, password = ?, userType = ?, designation = ?, domain = ?, dateOfJoining = ?, mobileNumber = ?, 
            mobileNumber2 = ?, email = ?, email2 = ?, address = ?, profileUrl = ?, dateOfBirth = ?, bankName = ?, 
            bankBranch = ?, accountNo = ?, ifscNo = ?, salary = ?, updatedAt = ?
        WHERE userName = ?
      `;

      await attendanceConnection.execute(sqlUpdate, [
        name || '-', hashedPassword || '-', userType || '-', designation || '-', domain || '-', dateOfJoining || '-',
        mobileNumber || '-', mobileNumber2 || null, email, email2 || null, address || '-', profileUrlValue || '-',
        dateOfBirth || null, bankName || '-', bankBranch || '-', accountNo || null,
        ifscNo || '-', salary || null, currentTime, userName,
      ]);

      return res.status(200).json({
        status: "Success",
        message: "Employee updated successfully",
      });
    } else {
      // Insert new employee
      const hashedPassword = crypto.createHash('md5').update(password).digest('hex');  // Hash password

      const sqlInsert = `
        INSERT INTO tbl_userdetails 
        (employeeId, name, userName, password, userType, designation, domain, dateOfJoining, mobileNumber, 
        mobileNumber2, email, email2, address, profileUrl, dateOfBirth, bankName, bankBranch, accountNo, ifscNo, 
        salary, createdAt, updatedAt, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await attendanceConnection.execute(sqlInsert, [
        employeeId|| '-', name|| '-', userName|| '-', hashedPassword|| '-', userType|| '-', designation|| '-', domain|| '-', dateOfJoining|| '-', mobileNumber|| '-',
        mobileNumber2 || null, email|| '-', email2 || null, address|| '-', profileUrlValue|| '-',
        dateOfBirth || null, bankName || '-', bankBranch || '-', accountNo || null,
        ifscNo || '-', salary || null, currentTime, currentTime, 1, // Set isActive to 1 by default
      ]);

      return res.status(201).json({
        status: "Success",
        message: "Employee added successfully",
      });
    }
  } catch (error) {
    console.error('Error adding or updating employee:', error);
    res.status(500).json({
      status: "Error",
      message: "Internal Server Error",
    });
  }
}; */
exports.addEmployee = async (req, res) => {
  const {
    employeeId,
    name,
    userName,
    password,
    userType,
    designation,
    domain,
    dateOfJoining,
    mobileNumber,
    mobileNumber2,
    email,
    email2,
    address,
    dateOfBirth,
    bankName,
    bankBranch,
    accountNo,
    ifscNo,
    salary,
    isActive,
  } = req.body;

  try {
    const currentTime = new Date();

    // Check if the user already exists (by username)
    const checkUserSql = "SELECT * FROM tbl_userdetails WHERE userName = ?";
    const [existingUser] = await attendanceConnection.execute(checkUserSql, [
      userName,
    ]);

    if (existingUser.length > 0) {
      // If the user exists, we fetch the current profile URL value (if any)
      const existingProfileUrl = existingUser[0].profileUrl;

      // Prepare update fields, only update if value is provided
      const updatedFields = {
        name: name || undefined,
        password: password
          ? crypto.createHash("md5").update(password).digest("hex")
          : undefined,
        userType: userType || undefined,
        designation: designation || undefined,
        domain: domain || undefined,
        dateOfJoining: dateOfJoining || undefined,
        mobileNumber: mobileNumber || undefined,
        mobileNumber2: mobileNumber2 || undefined,
        email: email || undefined,
        email2: email2 || undefined,
        address: address || undefined,
        // Only update profileUrl if a new file is uploaded, otherwise keep the existing value
        profileUrl: req.file ? req.file.filename : existingProfileUrl,
        dateOfBirth: dateOfBirth || undefined,
        bankName: bankName || undefined,
        bankBranch: bankBranch || undefined,
        accountNo: accountNo || undefined,
        ifscNo: ifscNo || undefined,
        salary: salary || undefined,
        updatedAt: currentTime,
        isActive: isActive || 1,
      };

      // Remove fields with undefined values to avoid updating them
      const fieldsToUpdate = Object.keys(updatedFields)
        .filter((key) => updatedFields[key] !== undefined)
        .map((key) => `${key} = ?`);

      const valuesToUpdate = Object.values(updatedFields).filter(
        (value) => value !== undefined
      );

      if (fieldsToUpdate.length > 0) {
        const sqlUpdate = `
          UPDATE tbl_userdetails
          SET ${fieldsToUpdate.join(", ")}
          WHERE userName = ?
        `;

        await attendanceConnection.execute(sqlUpdate, [
          ...valuesToUpdate,
          userName,
        ]);

        return res.status(200).json({
          status: "Success",
          message: "Employee updated successfully",
        });
      } else {
        return res.status(400).json({
          status: "Error",
          message: "No valid fields to update.",
        });
      }
    } else {
      // Insert new employee
      const hashedPassword = crypto
        .createHash("md5")
        .update(password)
        .digest("hex"); // Hash password

      const profileUrlValue = req.file ? req.file.filename : "-"; // Set profileUrl if file is uploaded

      const sqlInsert = `
        INSERT INTO tbl_userdetails 
        (employeeId, name, userName, password, userType, designation, domain, dateOfJoining, mobileNumber, 
        mobileNumber2, email, email2, address, profileUrl, dateOfBirth, bankName, bankBranch, accountNo, ifscNo, 
        salary, createdAt, updatedAt, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await attendanceConnection.execute(sqlInsert, [
        employeeId || "-",
        name || "-",
        userName || "-",
        hashedPassword || "-",
        userType || "-",
        designation || "-",
        domain || "-",
        dateOfJoining || "-",
        mobileNumber || "-",
        mobileNumber2 || null,
        email || "-",
        email2 || null,
        address || "-",
        profileUrlValue || "-",
        dateOfBirth || null,
        bankName || "-",
        bankBranch || "-",
        accountNo || null,
        ifscNo || "-",
        salary || null,
        currentTime,
        currentTime,
        isActive || 1, // Set isActive to 1 by default
      ]);

      return res.status(201).json({
        status: "Success",
        message: "Employee added successfully",
      });
    }
  } catch (error) {
    console.error("Error adding or updating employee:", error);
    res.status(500).json({
      status: "Error",
      message: "Internal Server Error",
    });
  }
};

exports.addEmployee1 = async (req, res) => {
  const {
    employeeId,
    name,
    userName,
    password,
    userType,
    designation,
    domain,
    dateOfJoining,
    mobileNumber,
    mobileNumber2,
    email,
    email2,
    address,
    profileUrl,
    dateOfBirth,
    bankName,
    bankBranch,
    accountNo,
    ifscNo,
    salary,
    isActive,
    fatherName,
    gender,
    bloodGroup,
    state,
    nationality,
    pincode,
    aadhaarNo,
    panNo,
    maritialStatus,
    spouseName,
    spouseJob,
    spouseNumber,
    spouseDob,
    weddingDay,
    child1Name,
    child1Dob,
    child2Name,
    child2Dob,
    DateOfReleaving,
    EmergencyContactFullName,
    EmergencyContactFullAddress,
    EmergencyContactState,
    EmergencyContactPincode,
    EmergencyMobileNumber,
    EmergencyContactRelationship,
    qualification,
    isTeamLeader,
  } = req.body;

  try {
    // console.log("req.body",req.body)
    const currentTime = new Date();

    // Check if the employee exists by employeeId
    const checkEmployeeSql =
      "SELECT * FROM tbl_userdetails WHERE employeeId = ?";
    const [existingEmployee] = await attendanceConnection.execute(
      checkEmployeeSql,
      [employeeId]
    );
    //if (id) {
    // if (existingEmployee.length === 0) {
    //   return res.status(404).json({ status: "Error", message: "Employee not found!" });
    // }
    // If the user exists, we fetch the current profile URL value (if any)
    //}

    if (existingEmployee.length > 0) {
      // const checkEmployeeSql = 'SELECT * FROM tbl_userdetails WHERE employeeId = ?';
      //const [existingEmployee] = await attendanceConnection.execute(checkEmployeeSql, [employeeId]);

      // If the employee exists, we fetch the current profile URL value (if any)
      const existingProfileUrl = existingEmployee[0].profileUrl;

      // Prepare update fields, only update if value is provided
      const updatedFields = {
        name: name || undefined,
        userName: userName || undefined,
        /* password: password
          ? crypto.createHash("md5").update(password).digest("hex")
          : undefined, */
        userType: userType || undefined,
        designation: designation || undefined,
        domain: domain || undefined,
        dateOfJoining: dateOfJoining || undefined,
        mobileNumber: mobileNumber || undefined,
        mobileNumber2: mobileNumber2 || undefined,
        email: email || undefined,
        email2: email2 || undefined,
        address: address || undefined,
        // Only update profileUrl if a new file is uploaded, otherwise keep the existing value
        profileUrl: req.file ? req.file.filename : existingProfileUrl,
        dateOfBirth: dateOfBirth || undefined,
        bankName: bankName || undefined,
        bankBranch: bankBranch || undefined,
        accountNo: accountNo || undefined,
        ifscNo: ifscNo || undefined,
        salary: salary || undefined,
        updatedAt: currentTime,
        isActive: isActive || 1,
        fatherName: fatherName || undefined,
        gender: gender || undefined,
        bloodGroup: bloodGroup || undefined,
        state: state || undefined,
        nationality: nationality || undefined,
        pincode: pincode || undefined,
        aadhaarNo: aadhaarNo || undefined,
        panNo: panNo || undefined,
        maritialStatus: maritialStatus || undefined,
        spouseName: spouseName || undefined,
        spouseJob: spouseJob || undefined,
        spouseNumber: spouseNumber || undefined,
        spouseDob: spouseDob || undefined,
        weddingDay: weddingDay || undefined,
        child1Name: child1Name || undefined,
        child1Dob: child1Dob || undefined,
        child2Name: child2Name || undefined,
        child2Dob: child2Dob || undefined,
        DateOfReleaving: DateOfReleaving || undefined,
        EmergencyContactFullName: EmergencyContactFullName || undefined,
        EmergencyContactFullAddress: EmergencyContactFullAddress || undefined,
        EmergencyContactState: EmergencyContactState || undefined,
        EmergencyContactPincode: EmergencyContactPincode || undefined,
        EmergencyMobileNumber: EmergencyMobileNumber || undefined,
        EmergencyContactRelationship: EmergencyContactRelationship || undefined,
        qualification: qualification || undefined,
        isTeamLeader: isTeamLeader || 0,
      };
      console.log(`Request body: ${JSON.stringify(req.body)}`);

      // Remove fields with undefined values to avoid updating them
      const fieldsToUpdate = Object.keys(updatedFields)
        .filter((key) => updatedFields[key] !== undefined)
        .map((key) => `${key} = ?`);

      const valuesToUpdate = Object.values(updatedFields).filter(
        (value) => value !== undefined
      );

      if (fieldsToUpdate.length > 0) {
        const sqlUpdate = `
          UPDATE tbl_userdetails
          SET ${fieldsToUpdate.join(", ")}
          WHERE employeeId = ?
        `;
        console.log("child2Dob", child2Dob);
        await attendanceConnection.execute(sqlUpdate, [
          ...valuesToUpdate,
          employeeId,
        ]);

        return res.status(200).json({
          status: "Success",
          message: "Employee updated successfully",
        });
      } else {
        return res.status(400).json({
          status: "Error",
          message: "No valid fields to update.",
        });
      }
    } else {
      //const existingProfileUrl = existingUser[0].profileUrl;

      // Insert new employee
      const hashedPassword = crypto
        .createHash("md5")
        .update(password)
        .digest("hex"); // Hash password
      const profileUrl = req.file ? req.file.filename : "-"; // Set profileUrl if file is uploaded
      console.log(profileUrl + "ggg");
      //`http://124.123.64.185:81/uploads/profile/${finalEmployeeId}.${req.file.extension}`
      console.log(`Request body: ${JSON.stringify(req.body)}`);

      //       const sqlInsert = `
      //   INSERT INTO tbl_userdetails
      //   (employeeId, name, userName, password, userType, designation, domain, dateOfJoining, mobileNumber,
      //   mobileNumber2, email, email2, address, profileUrl, dateOfBirth, bankName, bankBranch, accountNo, ifscNo,
      //   salary, createdAt, updatedAt, isActive, fatherName , gender,bloodGroup,  state , nationality , pincode, aadhaarNo, panNo , maritialStatus ,
      //   spouseName , spouseJob ,  spouseNumber , spouseDob , weddingDay ,child1Name , child1Dob , child2Name , child2Dob , DateOfReleaving ,
      //  EmergencyContactFullName, EmergencyContactFullAddress ,EmergencyContactState , EmergencyContactPincode,EmergencyMobileNumber, EmergencyContactRelationship,qualification,isTeamLeader)
      //   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      // `;

      //       await attendanceConnection.execute(sqlInsert, [
      //         employeeId || '-', name || '-', userName || '-', hashedPassword || '-', userType || '-', designation || '-', domain || '-', dateOfJoining || null, mobileNumber || '-',
      //         mobileNumber2 || null, email || '-', email2 || null, address || '-', profileUrl|| '-',
      //         dateOfBirth || null, bankName || '-', bankBranch || '-', accountNo || null,
      //         ifscNo || '-', salary || null, currentTime, currentTime, isActive || 1, // Set isActive to 1 by default
      //         fatherName || '-', gender || '-', bloodGroup || '-', state || '-', nationality || '-', pincode || '-', aadhaarNo || '-',
      //         panNo || '-', maritialStatus || '-', spouseName || '-', spouseJob || '-', spouseNumber || '-', spouseDob || null,
      //         weddingDay || null, child1Name || '-', child1Dob || null, child2Name || '-', child2Dob || null,
      //         DateOfReleaving || null, EmergencyContactFullName || '-', EmergencyContactFullAddress || '-',
      //         EmergencyContactState || '-', EmergencyContactPincode || '-', EmergencyMobileNumber || '-', EmergencyContactRelationship || '-',
      //         qualification || '-',isTeamLeader || 0]);

      const sqlInsert = `
  INSERT INTO tbl_userdetails 
  (employeeId, name, userName, password, userType, designation, domain, dateOfJoining, mobileNumber, mobileNumber2, email, email2, address, profileUrl, dateOfBirth, bankName, bankBranch, accountNo, ifscNo, 
  salary, createdAt, updatedAt, isActive, fatherName , gender, bloodGroup, state, nationality , pincode, aadhaarNo, panNo , maritialStatus , 
  spouseName , spouseJob , spouseNumber , spouseDob , weddingDay , child1Name , child1Dob , child2Name , child2Dob , DateOfReleaving,
  EmergencyContactFullName, EmergencyContactFullAddress , EmergencyContactState , EmergencyContactPincode, EmergencyMobileNumber, EmergencyContactRelationship, qualification, isTeamLeader)
  VALUES (?,?,?,?,?,?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

      await attendanceConnection.execute(sqlInsert, [
        employeeId || "-",
        name || "-",
        userName || "-",
        hashedPassword || "-",
        userType || "-",
        designation || "-",
        domain || "-",
        dateOfJoining || null,
        mobileNumber || "-",
        mobileNumber2 || null,
        email || "-",
        email2 || null,
        address || "-",
        profileUrl || "-",
        dateOfBirth || null,
        bankName || "-",
        bankBranch || "-",
        accountNo || null,
        ifscNo || "-",
        salary || null,
        currentTime,
        currentTime,
        isActive || 1,
        fatherName || "-",
        gender || "-",
        bloodGroup || "-",
        state || "-",
        nationality || "-",
        pincode || "-",
        aadhaarNo || "-",
        panNo || "-",
        maritialStatus || "-",
        spouseName || "-",
        spouseJob || "-",
        spouseNumber || "-",
        spouseDob || null,
        weddingDay || null,
        child1Name || "-",
        child1Dob || null,
        child2Name || "-",
        child2Dob || null,
        DateOfReleaving || null,
        EmergencyContactFullName || "-",
        EmergencyContactFullAddress || "-",
        EmergencyContactState || "-",
        EmergencyContactPincode || "-",
        EmergencyMobileNumber || "-",
        EmergencyContactRelationship || "-",
        qualification || "-",
        isTeamLeader || 0,
      ]);

      return res.status(201).json({
        status: "Success",
        message: "Employee added successfully",
      });
    }
  } catch (error) {
    console.error("Error adding or updating employee:", error);
    res.status(200).json({
      status: "Error",
      message: error,
    });
  }
};

/*exports.addEmployee1 = async (req, res) => {
  const {
    employeeId, name, userName, password, userType, designation, domain, dateOfJoining,
    mobileNumber, mobileNumber2, email, email2, address, dateOfBirth,
    bankName, bankBranch, accountNo, ifscNo, salary, isActive, fatherName, gender,
    bloodGroup, state, nationality, pincode, aadhaarNo, panNo, maritialStatus, spouseName,
    spouseJob, spouseNumber, spouseDob, weddingDay, child1Name, child1Dob, child2Name, child2Dob,
    DateOfReleaving, EmergencyContactFullName, EmergencyContactFullAddress, EmergencyContactState,
    EmergencyContactPincode, EmergencyMobileNumber, EmergencyContactRelationship, qualification, isTeamLeader, profileUrl
  } = req.body;

  try {
    const currentTime = new Date();

    // Check if employee exists
    const checkEmployeeSql = 'SELECT * FROM tbl_userdetails WHERE employeeId = ?';
    const [existingEmployee] = await attendanceConnection.execute(checkEmployeeSql, [employeeId]);

    if (existingEmployee.length > 0) {
      const existingProfileUrl = existingEmployee[0].profileUrl || '';

      const updatedFields = {
        name,
        userName,
        password: password ? crypto.createHash('md5').update(password).digest('hex') : undefined,
        userType,
        designation,
        domain,
        dateOfJoining,
        mobileNumber,
        mobileNumber2,
        email,
        email2,
        address,
        profileUrl: req.file ? req.file.filename : existingProfileUrl,
        dateOfBirth,
        bankName,
        bankBranch,
        accountNo,
        ifscNo,
        salary,
        updatedAt: currentTime,
        isActive: isActive || 1,
        fatherName,
        gender,
        bloodGroup,
        state,
        nationality,
        pincode,
        aadhaarNo,
        panNo,
        maritialStatus,
        spouseName,
        spouseJob,
        spouseNumber,
        spouseDob,
        weddingDay,
        child1Name,
        child1Dob,
        child2Name,
        child2Dob,
        DateOfReleaving,
        EmergencyContactFullName,
        EmergencyContactFullAddress,
        EmergencyContactState,
        EmergencyContactPincode,
        EmergencyMobileNumber,
        EmergencyContactRelationship,
        qualification,
        isTeamLeader: isTeamLeader || 0,
      };

      // Remove undefined fields
      const fieldsToUpdate = Object.keys(updatedFields).filter(key => updatedFields[key] !== undefined);
      const valuesToUpdate = fieldsToUpdate.map(key => updatedFields[key]);

      if (fieldsToUpdate.length > 0) {
        const sqlUpdate = `
          UPDATE tbl_userdetails
          SET ${fieldsToUpdate.map(field => `${field} = ?`).join(', ')}
          WHERE employeeId = ?
        `;
        await attendanceConnection.execute(sqlUpdate, [...valuesToUpdate, employeeId]);

        return res.status(200).json({
          status: "Success",
          message: "Employee updated successfully",
        });
      } else {
        return res.status(400).json({
          status: "Error",
          message: "No valid fields to update.",
        });
      }
    } else {
      // Insert new employee
      const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
      const profileUrlValue = req.file ? req.file.filename : '';

      const sqlInsert = `
        INSERT INTO tbl_userdetails 
        (employeeId, name, userName, password, userType, designation, domain, dateOfJoining, mobileNumber, 
        mobileNumber2, email, email2, address, profileUrl, dateOfBirth, bankName, bankBranch, accountNo, ifscNo, 
        salary, createdAt, updatedAt, isActive, fatherName, gender, bloodGroup, state, nationality, pincode, aadhaarNo, 
        panNo, maritialStatus, spouseName, spouseJob, spouseNumber, spouseDob, weddingDay, child1Name, child1Dob, 
        child2Name, child2Dob, DateOfReleaving, EmergencyContactFullName, EmergencyContactFullAddress, 
        EmergencyContactState, EmergencyContactPincode, EmergencyMobileNumber, EmergencyContactRelationship, 
        qualification, isTeamLeader)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await attendanceConnection.execute(sqlInsert, [
        employeeId || '-', name || '-', userName || '-', hashedPassword || '-', userType || '-', designation || '-', 
        domain || '-', dateOfJoining || null, mobileNumber || '-', mobileNumber2 || null, email || '-', email2 || null, 
        address || '-', profileUrl, dateOfBirth || null, bankName || '-', bankBranch || '-', accountNo || null, 
        ifscNo || '-', salary || null, currentTime, currentTime, isActive || 1, fatherName || '-', gender || '-', 
        bloodGroup || '-', state || '-', nationality || '-', pincode || '-', aadhaarNo || '-', panNo || '-', 
        maritialStatus || '-', spouseName || '-', spouseJob || '-', spouseNumber || '-', spouseDob || null, 
        weddingDay || null, child1Name || '-', child1Dob || null, child2Name || '-', child2Dob || null, 
        DateOfReleaving || null, EmergencyContactFullName || '-', EmergencyContactFullAddress || '-', 
        EmergencyContactState || '-', EmergencyContactPincode || '-', EmergencyMobileNumber || '-', 
        EmergencyContactRelationship || '-', qualification || '-', isTeamLeader || 0
      ]);

      return res.status(201).json({
        status: "Success",
        message: "Employee added successfully",
      });
    }
  } catch (error) {
    console.error('Error adding or updating employee:', error);
    return res.status(500).json({
      status: "Error",
      message: "Internal Server Error",
      error: error.message
    });
  }
};*/

exports.generateEmployeeId = async (req, res) => {
  try {
    const sql = `SELECT employeeId FROM attendance_register.tbl_userdetails
                WHERE CAST(SUBSTRING(employeeId, 4) AS UNSIGNED) = (
                 SELECT MAX(CAST(SUBSTRING(employeeId, 4) AS UNSIGNED))
                FROM attendance_register.tbl_userdetails);  `;

    const [results] = await attendanceConnection.execute(sql);
    console.log("Result:", results);
    let employeeId = results[0].employeeId;
    console.log(employeeId + "LL");
    //employeeId = `kst${employeeId + 1}`;
    //const employeeId = "kst7134";
    const numericPart = employeeId.substring(3); // Extracts from the 4th character onward
    const prefix = employeeId.substring(0, 3); // Extracts the first 3 characters
    employeeId = parseInt(numericPart) + 1;
    const finalEmployeeId = `${prefix}${employeeId}`;
    console.log("Prefix:", prefix); // Output: kst
    console.log("Numeric Part:", numericPart); // Output: 713
    console.log(finalEmployeeId + "Oo");

    res.send({ status: "Success", data: finalEmployeeId });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server error");
  }
};

// exports.addEmployee1 = async (req, res) => {
//   const {
//     employeeId, name, userName, password, userType, designation, domain, dateOfJoining,
//     mobileNumber, mobileNumber2, email, email2, address, dateOfBirth,
//     bankName, bankBranch, accountNo, ifscNo, salary, isActive, fatherName, gender,
//     bloodGroup, state, nationality, pincode, aadhaarNo, panNo, maritalStatus, spouseName,
//     spouseJob, spouseNumber, spouseDob, weddingDay, child1Name, child1Dob, child2Name, child2Dob,
//     dateOfReleaving, EmergencyContactFullName, EmergencyContactFullAddress, EmergencyContactState,
//     EmergencyContactPincode, EmergencyMobileNumber, EmergencyContactRelationship, qualification
//   } = req.body;

//   try {
//     const profileUrlValue = req.file ? req.file.filename : "-";
//     const currentTime = new Date();

//     // Validate date formats
//     const validateDate = (date) => (date && !isNaN(Date.parse(date)) ? date : null);

//     const spouseDobFormatted = validateDate(spouseDob);
//     const dateOfReleavingFormatted = validateDate(dateOfReleaving);
//     const child1DobFormatted = validateDate(child1Dob);
//     const child2DobFormatted = validateDate(child2Dob);
//     const weddingDayFormatted = validateDate(weddingDay);
//     const dateOfBirthFormatted = validateDate(dateOfBirth);

//     // Check if the employee already exists
//     const checkEmployeeSql = "SELECT * FROM tbl_userdetails WHERE employeeId = ?";
//     const [existingEmployee] = await attendanceConnection.execute(checkEmployeeSql, [employeeId]);

//     const hashedPassword = password ? crypto.createHash("md5").update(password).digest("hex") : null;

//     if (existingEmployee.length > 0) {
//       // Update only provided fields using COALESCE
//       const sqlUpdate = `
//         UPDATE tbl_userdetails
//         SET
//           name = COALESCE(?, name),
//           password = COALESCE(?, password),
//           userType = COALESCE(?, userType),
//           designation = COALESCE(?, designation),
//           domain = COALESCE(?, domain),
//           dateOfJoining = COALESCE(?, dateOfJoining),
//           mobileNumber = COALESCE(?, mobileNumber),
//           mobileNumber2 = COALESCE(?, mobileNumber2),
//           email = COALESCE(?, email),
//           email2 = COALESCE(?, email2),
//           address = COALESCE(?, address),
//           profileUrl = COALESCE(?, profileUrl),
//           dateOfBirth = COALESCE(?, dateOfBirth),
//           bankName = COALESCE(?, bankName),
//           bankBranch = COALESCE(?, bankBranch),
//           accountNo = COALESCE(?, accountNo),
//           ifscNo = COALESCE(?, ifscNo),
//           salary = COALESCE(?, salary),
//           updatedAt = ?,
//           isActive = COALESCE(?, isActive),
//           fatherName = COALESCE(?, fatherName),
//           gender = COALESCE(?, gender),
//           bloodGroup = COALESCE(?, bloodGroup),
//           state = COALESCE(?, state),
//           nationality = COALESCE(?, nationality),
//           pincode = COALESCE(?, pincode),
//           aadhaarNo = COALESCE(?, aadhaarNo),
//           panNo = COALESCE(?, panNo),
//           maritalStatus = COALESCE(?, maritalStatus),
//           spouseName = COALESCE(?, spouseName),
//           spouseJob = COALESCE(?, spouseJob),
//           spouseNumber = COALESCE(?, spouseNumber),
//           spouseDob = COALESCE(?, spouseDob),
//           weddingDay = COALESCE(?, weddingDay),
//           child1Name = COALESCE(?, child1Name),
//           child1Dob = COALESCE(?, child1Dob),
//           child2Name = COALESCE(?, child2Name),
//           child2Dob = COALESCE(?, child2Dob),
//           dateOfReleaving = COALESCE(?, dateOfReleaving),
//           EmergencyContactFullName = COALESCE(?, EmergencyContactFullName),
//           EmergencyContactFullAddress = COALESCE(?, EmergencyContactFullAddress),
//           EmergencyContactState = COALESCE(?, EmergencyContactState),
//           EmergencyContactPincode = COALESCE(?, EmergencyContactPincode),
//           EmergencyMobileNumber = COALESCE(?, EmergencyMobileNumber),
//           EmergencyContactRelationship = COALESCE(?, EmergencyContactRelationship),
//           qualification = COALESCE(?, qualification)
//         WHERE employeeId = ?
//       `;

//       await attendanceConnection.execute(sqlUpdate, [
//         name, hashedPassword, userType, designation, domain, dateOfJoining, mobileNumber,
//         mobileNumber2, email, email2, address, profileUrlValue, dateOfBirthFormatted,
//         bankName, bankBranch, accountNo, ifscNo, salary, currentTime, isActive,
//         fatherName, gender, bloodGroup, state, nationality, pincode, aadhaarNo,
//         panNo, maritalStatus, spouseName, spouseJob, spouseNumber, spouseDobFormatted,
//         weddingDayFormatted, child1Name, child1DobFormatted, child2Name, child2DobFormatted,
//         dateOfReleavingFormatted, EmergencyContactFullName, EmergencyContactFullAddress,
//         EmergencyContactState, EmergencyContactPincode, EmergencyMobileNumber, EmergencyContactRelationship,
//         qualification, employeeId
//       ]);

//       return res.status(200).json({ status: "Success", message: "Employee updated successfully" });
//     } else {
//       // Insert new employee
//       const sqlInsert = `
//       INSERT INTO tbl_userdetails
//       (employeeId, name, userName, password, userType, designation, domain, dateOfJoining, mobileNumber,
//       mobileNumber2, email, email2, address, profileUrl, dateOfBirth, bankName, bankBranch, accountNo, ifscNo,
//       salary, createdAt, updatedAt, isActive, fatherName, gender, bloodGroup, state, nationality, pincode, aadhaarNo,
//       panNo, maritalStatus, spouseName, spouseJob, spouseNumber, spouseDob, weddingDay, child1Name, child1Dob,
//       child2Name, child2Dob, dateOfReleaving, EmergencyContactFullName, EmergencyContactFullAddress,
//       EmergencyContactState, EmergencyContactPincode, EmergencyMobileNumber, EmergencyContactRelationship, qualification)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     await attendanceConnection.execute(sqlInsert, [
//       employeeId, name || null, userName || null, hashedPassword || null, userType || null, designation || null, domain || null,
//       dateOfJoining || null, mobileNumber || null, mobileNumber2 || null, email || null, email2 || null, address || null,
//       profileUrlValue || "-", dateOfBirthFormatted || null, bankName || null, bankBranch || null, accountNo || null, ifscNo || null,
//       salary || null, currentTime, currentTime, 1, fatherName || null, gender || null, bloodGroup || null, state || null,
//       nationality || null, pincode || null, aadhaarNo || null, panNo || null, maritalStatus || null, spouseName || null,
//       spouseJob || null, spouseNumber || null, spouseDobFormatted || null, weddingDayFormatted || null, child1Name || null,
//       child1DobFormatted || null, child2Name || null, child2DobFormatted || null, dateOfReleavingFormatted || null,
//       EmergencyContactFullName || null, EmergencyContactFullAddress || null, EmergencyContactState || null,
//       EmergencyContactPincode || null, EmergencyMobileNumber || null, EmergencyContactRelationship || null, qualification || null
//     ]);

//       return res.status(201).json({ status: "Success", message: "Employee added successfully" });
//     }
//   } catch (error) {
//     console.error("Error adding or updating employee:", error);
//     return res.status(500).json({ status: "Error", message: "Internal Server Error" });
//   }
// };
exports.getEmployeeById = async (req, res) => {
  const { employeeId } = req.params;

  try {
    const sql = `SELECT * FROM tbl_userdetails WHERE employeeId = ?`;
    const [result] = await attendanceConnection.execute(sql, [employeeId]);

    if (result.length > 0) {
      return res.status(200).json({
        status: "Success",
        data: result[0],
      });
    } else {
      return res.status(404).json({
        status: "Error",
        message: "Employee not found",
      });
    }
  } catch (error) {
    console.error("Error fetching employee:", error);
    return res.status(500).json({
      status: "Error",
      message: "Internal Server Error",
    });
  }
};

// Delete Employee function
exports.deleteEmployee = async (req, res) => {
  const { id } = req.params; // Get the employee ID from the request parameters

  try {
    // Check if the employee exists
    const checkEmployeeSql = "SELECT * FROM tbl_userdetails WHERE id = ?";
    const [employee] = await attendanceConnection.execute(checkEmployeeSql, [
      id,
    ]);

    if (employee.length === 0) {
      return res.status(404).json({
        status: "Error",
        message: "Employee not found",
      });
    }

    // Delete the employee
    const deleteEmployeeSql = "DELETE FROM tbl_userdetails WHERE id = ?";
    await attendanceConnection.execute(deleteEmployeeSql, [id]);

    return res.status(200).json({
      status: "Success",
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({
      status: "Error",
      message: "Internal Server Error",
    });
  }
};

/* exports.reportHistory_admin = async (req, res, next) => {
  let { domain, fromDate, toDate } = req.body;
  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 10;
  const offset = (page - 1) * limit;

  function processResults(results) {
    const groupedResults = results.reduce((acc, row) => {
      const {
        employeeId, id,created_at, reportDetails, selectedProjectList, subCategoryList, reportDate, name
      } = row;

      const report = {
        id,
        reportDetails,
        selectedProjectList,
        subCategoryList,
        employeeId,created_at,
        name
      };

      if (!acc[reportDate]) {
        acc[reportDate] = [];
      }

      acc[reportDate].push(report);

      return acc;
    }, {});
    return Object.keys(groupedResults).map(reportDate => ({
      reportDate,
      reports: groupedResults[reportDate]
    }));
  }

  try {
    if (domain === 'Development') {
      fromDate = fromDate || 'CURDATE()';
      toDate = toDate || 'CURDATE()';

      const sql = `
        SELECT 
          er.id,
          er.employeeId,
          er.reportDetails,
          er.seletedProjectList,
          er.subCategoryList,er.created_at,
          DATE_FORMAT(er.reportDate, '%d-%b-%Y') AS reportDate,
          ud.name
        FROM 
          tbl_emp_reports er
        INNER JOIN 
          attendance_register.tbl_userdetails ud 
        ON 
          er.employeeId = ud.employeeId
        WHERE 
          er.isActive = '1' 
          AND er.reportDate BETWEEN '${fromDate}' AND '${toDate}'
        ORDER BY 
          er.reportDate DESC LIMIT ${limit} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM tbl_emp_reports 
        WHERE isActive = '1' 
        AND reportDate BETWEEN '${fromDate}' AND '${toDate}'
      `;

      const [countResult] = await connection.execute(countSql);
      const totalRecords = countResult[0].total;

      const [result] = await connection.execute(sql);
      const processedResults = processResults(result);

      res.send({ status: "Success", totalRecords, limit, page, data: processedResults });

    } else {
      const sql = `
        SELECT 
          r.id,
          r.employeeId,
          e.name, 
          r.application,
          r.location,
          r.receivedDate,
          r.regNo,
          r.noOfForms,
          r.scanning,
          r.typing,
          r.photoshop,
          r.coraldraw,
          r.underPrinting,
          r.toBeDelivered,
          r.delivered,
          r.remarks,
          DATE_FORMAT(r.reportDate, '%d-%b-%Y') AS reportDate 
        FROM 
          report.tbl_idcard_reports r
        LEFT JOIN 
          attendance_register.tbl_userdetails e 
        ON 
          r.employeeId = e.employeeId 
        WHERE 
          r.isActive = '1'
          AND r.reportDate BETWEEN ${fromDate ? `"${fromDate}"` : 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)'}
          AND ${toDate ? `"${toDate}"` : 'CURDATE()'}
        ORDER BY 
          r.reportDate DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM tbl_idcard_reports 
        WHERE isActive = '1'
        AND reportDate BETWEEN ${fromDate ? `"${fromDate}"` : 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)'} 
        AND ${toDate ? `"${toDate}"` : 'CURDATE()'}
      `;

      const [countResult] = await connection.execute(countSql);
      const totalRecords = countResult[0].total;

      const [result] = await connection.execute(sql);
      res.send({ status: "Success", totalRecords, limit, page, data: result });
    }
  } catch (error) {
    next(error);
  }
}; */
exports.reportHistory_admin = async (req, res, next) => {
  let { domain, fromDate, toDate, employeeId, page = 1, limit = 10 } = req.body;
  const offset = (page - 1) * limit;

  function processResults(results) {
    const sortedResults = results
      .map((row) => {
        const {
          employeeId,
          id,
          created_at,
          reportDetails,
          selectedProjectList,
          subCategoryList,
          reportDate,
          name,
          review,
          evaluation,
        } = row;

        return {
          id,
          reportDetails,
          selectedProjectList,
          subCategoryList,
          employeeId,
          created_at,
          review,
          evaluation,
          name,
          reportDate,
        };
      })
      .sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate));

    return sortedResults;
  }

  try {
    if (domain === "Development") {
      fromDate = fromDate || "CURDATE()";
      toDate = toDate || "CURDATE()";

      const selectedEmpFilter =
        employeeId === "All" ? "" : `AND er.employeeId = '${employeeId}'`;

      const sql = `
  SELECT 
    er.id,
    er.employeeId,
    er.reportDetails,
    er.seletedProjectList,
    er.subCategoryList,
    er.created_at, 
    er.review,
    er.evaluation,
    DATE_FORMAT(er.reportDate, '%d-%b-%Y') AS reportDate,
    ud.name
  FROM 
    tbl_emp_reports er
  INNER JOIN 
    attendance_register.tbl_userdetails ud 
  ON 
    er.employeeId = ud.employeeId
  WHERE 
    er.isActive = '1' 
    AND er.reportDate BETWEEN '${fromDate}' AND '${toDate}'
    ${selectedEmpFilter}
  ORDER BY 
    er.reportDate DESC 
  LIMIT ${limit} OFFSET ${offset};
`;

      const countSql = `
  SELECT COUNT(*) as total
  FROM tbl_emp_reports er 
  WHERE er.isActive = '1' 
  AND er.reportDate BETWEEN '${fromDate}' AND '${toDate}'
  ${selectedEmpFilter};
`;

      const [countResult] = await connection.execute(countSql);
      const totalRecords = countResult[0].total;

      const [result] = await connection.execute(sql);
      const processedResults = processResults(result);

      res.send({
        status: "Success",
        totalRecords,
        limit,
        page,
        data: processedResults,
      });
    } else {
      const sql = `
        SELECT 
          r.id,
          r.employeeId,
          e.name, 
          r.application,
          r.location,
          r.receivedDate,
          r.regNo,
          r.noOfForms,
          r.scanning,
          r.typing,
          r.photoshop,
          r.coraldraw,
          r.underPrinting,
          r.toBeDelivered,
          r.delivered,
          r.remarks,
          DATE_FORMAT(r.reportDate, '%d-%b-%Y') AS reportDate 
        FROM 
          report.tbl_idcard_reports r
        LEFT JOIN 
          attendance_register.tbl_userdetails e 
        ON 
          r.employeeId = e.employeeId 
        WHERE 
          r.isActive = '1'
          AND r.reportDate BETWEEN ${
            fromDate ? `"${fromDate}"` : "DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
          }
          AND ${toDate ? `"${toDate}"` : "CURDATE()"}
        ORDER BY 
          r.reportDate DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM tbl_idcard_reports 
        WHERE isActive = '1'
        AND reportDate BETWEEN ${
          fromDate ? `"${fromDate}"` : "DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
        } 
        AND ${toDate ? `"${toDate}"` : "CURDATE()"}
      `;

      const [countResult] = await connection.execute(countSql);
      const totalRecords = countResult[0].total;

      const [result] = await connection.execute(sql);
      res.send({ status: "Success", totalRecords, limit, page, data: result });
    }
  } catch (error) {
    next(error);
  }
};
// exports.reportHistory_admin = async (req, res, next) => {
//   let { domain, fromDate, toDate } = req.body;
//   const page = parseInt(req.body.page) || 1;
//   const limit = parseInt(req.body.limit) || 10;
//   const offset = (page - 1) * limit;

//   function processResults(results) {
//     const groupedResults = results.reduce((acc, row) => {
//       const {
//         employeeId, id, reportDetails, selectedProjectList, subCategoryList, reportDate, name,review,
//         evaluation
//       } = row;

//       const report = {
//         id,
//         reportDetails,
//         selectedProjectList,
//         subCategoryList,
//         employeeId,
//         review,
//         evaluation,
//         name
//       };

//       if (!acc[reportDate]) {
//         acc[reportDate] = [];
//       }

//       acc[reportDate].push(report);

//       return acc;
//     }, {});
//     return Object.keys(groupedResults).map(reportDate => ({
//       reportDate,
//       reports: groupedResults[reportDate]
//     }));
//   }

//   try {
//     if (domain === 'Development') {
//       fromDate = fromDate || 'CURDATE()';
//       toDate = toDate || 'CURDATE()';

//       const sql = `
//         SELECT
//           er.id,
//           er.employeeId,
//           er.reportDetails,
//           er.seletedProjectList,
//           er.subCategoryList,
//           er.review,
//           er.evaluation,
//           DATE_FORMAT(er.reportDate, '%d-%b-%Y') AS reportDate,
//           ud.name
//         FROM
//           tbl_emp_reports er
//         INNER JOIN
//           attendance_register.tbl_userdetails ud
//         ON
//           er.employeeId = ud.employeeId
//         WHERE
//           er.isActive = '1'
//           AND er.reportDate BETWEEN '${fromDate}' AND '${toDate}'
//         ORDER BY
//           er.reportDate DESC LIMIT ${limit} OFFSET ${offset}
//       `;

//       const countSql = `
//         SELECT COUNT(*) as total
//         FROM tbl_emp_reports
//         WHERE isActive = '1'
//         AND reportDate BETWEEN '${fromDate}' AND '${toDate}'
//       `;

//       const [countResult] = await connection.execute(countSql);
//       const totalRecords = countResult[0].total;

//       const [result] = await connection.execute(sql);
//       const processedResults = processResults(result);

//       res.send({ status: "Success", totalRecords, limit, page, data: processedResults });

//     } else {
//       const sql = `
//         SELECT
//           r.id,
//           r.employeeId,
//           e.name,
//           r.application,
//           r.location,
//           r.receivedDate,
//           r.regNo,
//           r.noOfForms,
//           r.scanning,
//           r.typing,
//           r.photoshop,
//           r.coraldraw,
//           r.underPrinting,
//           r.toBeDelivered,
//           r.delivered,
//           r.remarks,
//           DATE_FORMAT(r.reportDate, '%d-%b-%Y') AS reportDate
//         FROM
//           report.tbl_idcard_reports r
//         LEFT JOIN
//           attendance_register.tbl_userdetails e
//         ON
//           r.employeeId = e.employeeId
//         WHERE
//           r.isActive = '1'
//           AND r.reportDate BETWEEN ${fromDate ? `"${fromDate}"` : 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)'}
//           AND ${toDate ? `"${toDate}"` : 'CURDATE()'}
//         ORDER BY
//           r.reportDate DESC
//         LIMIT ${limit} OFFSET ${offset}
//       `;

//       const countSql = `
//         SELECT COUNT(*) as total
//         FROM tbl_idcard_reports
//         WHERE isActive = '1'
//         AND reportDate BETWEEN ${fromDate ? `"${fromDate}"` : 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)'}
//         AND ${toDate ? `"${toDate}"` : 'CURDATE()'}
//       `;

//       const [countResult] = await connection.execute(countSql);
//       const totalRecords = countResult[0].total;

//       const [result] = await connection.execute(sql);
//       res.send({ status: "Success", totalRecords, limit, page, data: result });
//     }
//   } catch (error) {
//     next(error);
//   }
// };

exports.create_project = async (req, res, next) => {
  const { id, projectName, subProject } = req.body;
  const subProjectString = JSON.stringify(subProject);
  try {
    if (id) {
      const sql = `UPDATE tbl_projects SET subProject='${subProjectString}',project='${projectName}' WHERE id=${id}`;
      const [result] = await connection.execute(sql);
      res.send({
        status: "Success",
        message: "ProjectDetails Updated Successfully",
      });
    } else {
      const sql = `Insert into tbl_projects(project,subProject)Values('${projectName}','${subProjectString}')`;
      const [result] = await connection.execute(sql);
      res.send({
        status: "Success",
        message: "ProjectDetails Inserted Successfully",
      });
    }
  } catch (error) {
    next(error);
  }
};
exports.delete_project = async (req, res, next) => {
  const { id } = req.body;
  try {
    const sql = `update tbl_projects set isActive='0' where id=${id}`;
    const [result] = await connection.execute(sql);
    res.send({
      status: "Success",
      message: "ProjectDetails Deleted Successfully",
    });
  } catch (error) {
    next(error);
  }
};

// exports.applyLeave = async (req, res, next) => {
//   const {
//     Employee_id,
//     userName,
//     leaveTypes,
//     leaveTimes,
//     startDate,
//     endDate,
//     reason,
//   } = req.body;

//   try {
//     console.log("Request body:", req.body);

//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     const timeDifference = end.getTime() - start.getTime();
//     let noOfDays = timeDifference / (1000 * 3600 * 24) + 1;

//     if (startDate === endDate) {
//       if (leaveTimes === "Full Day") {
//         noOfDays = 1;
//       } else if (leaveTimes === "Halfday") {
//         noOfDays = 0;
//       } else if (leaveTypes === "Permission") {
//         noOfDays = 0;
//       }
//     } else {
//       if (leaveTimes === "Halfday") {
//         noOfDays -= 0.5;
//       }
//     }

//     const currentMonth = start.getMonth() + 1;
//     const currentYear = start.getFullYear();

//     const checkCasualLeaveQuery = `
//       SELECT * FROM leaverequest_form
//       WHERE Employee_id = ?
//         AND leaveTypes = 'Casual Leave'
//         AND MONTH(startDate) = ?
//         AND YEAR(startDate) = ?
//     `;
//     const [casualLeave] = await attendanceConnection.execute(
//       checkCasualLeaveQuery,
//       [Employee_id, currentMonth, currentYear]
//     );

//     if (casualLeave.length > 0 && leaveTypes === "Casual Leave") {
//       return res.status(400).send({
//         status: "Error",
//         message: "Casual Leave has already been used this month.",
//       });
//     }

//     const checkSaturdayOffQuery = `
//       SELECT * FROM leaverequest_form
//       WHERE Employee_id = ?
//         AND leaveTypes = 'Saturday Off'
//         AND MONTH(startDate) = ?
//         AND YEAR(startDate) = ?
//     `;
//     const [saturdayOff] = await attendanceConnection.execute(
//       checkSaturdayOffQuery,
//       [Employee_id, currentMonth, currentYear]
//     );

//     if (saturdayOff.length > 0 && leaveTypes === "Saturday Off") {
//       return res.status(400).send({
//         status: "Error",
//         message: "Saturday Off has already been used this month.",
//       });
//     }

//     const insertLeaveQuery = `
//       INSERT INTO leaverequest_form (Employee_id, userName, leaveTypes, leaveTimes, startDate, endDate, reason, noOfDays, status)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
//     `;

//     const [result] = await attendanceConnection.execute(insertLeaveQuery, [
//       Employee_id !== undefined ? Employee_id : null,
//       userName !== undefined ? userName : null,
//       leaveTypes !== undefined ? leaveTypes : null,
//       leaveTimes !== undefined ? leaveTimes : null,
//       startDate !== undefined ? startDate : null,
//       endDate !== undefined ? endDate : null,
//       reason !== undefined ? reason : null,
//       noOfDays,
//     ]);

//     res.send({
//       status: "Success",
//       message: "Leave applied successfully",
//       data: { Id: result.insertId },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

exports.applyLeave = async (req, res, next) => {
  let {
    Employee_id,
    userName,
    leaveTypes,
    leaveTimes,
    leaveTimingCategory,
    startDate,
    endDate,
    reason,
  } = req.body;
  leaveTimingCategory = parseInt(leaveTimingCategory);
  console.log({
    Employee_id,
    userName,
    leaveTypes,
    leaveTimes,
    leaveTimingCategory,
    startDate,
    endDate,
    reason,
  });
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // No Past Dates
    if (start < today) {
      return res.status(400).json({
        status: "Error",
        message: "Cannot apply for past dates.",
      });
    }
    // Skip rules check for Permission leaves
    // if (leaveTypes !== "Permission") {
    //   const sql = "SELECT * FROM rules_form ORDER BY id DESC LIMIT 1";

    //   try {
    //     const rulesResult = await attendanceConnection.execute(sql);
    //     const rules = rulesResult[0];
    //     const currentMonth = start.getMonth() + 1;
    //     const currentYear = start.getFullYear();
    //     const dayOfWeek = start.getDay(); // 6 = Saturday
    //     // Casual Leave Checks
    //     if (leaveTypes === "Casual Leave") {
    //       if (startDate !== endDate) {
    //         return res.status(400).json({
    //           status: "Error",
    //           message: "Casual Leave must be for a single day only.",
    //         });
    //       }
    //       const [casualExists] = await attendanceConnection.execute(
    //         `SELECT 1 FROM leaverequest_form
    //          WHERE Employee_id = ? AND leaveTypes = 'Casual Leave'
    //          AND MONTH(startDate) = ? AND YEAR(startDate) = ?`,
    //         [Employee_id, currentMonth, currentYear]
    //       );
    //       if (casualExists.length > 0) {
    //         return res.status(400).json({
    //           status: "Error",
    //           message: "Casual Leave already applied this month.",
    //         });
    //       }
    //     }
    //     // Saturday Off Checks
    //     if (leaveTypes === "Saturday Off") {
    //       if (startDate !== endDate) {
    //         return res.status(400).json({
    //           status: "Error",
    //           message: "Saturday Off must be for a single day only.",
    //         });
    //       }
    //       if (dayOfWeek !== 6) {
    //         return res.status(400).json({
    //           status: "Error",
    //           message: "Saturday Off can only be applied on Saturdays.",
    //         });
    //       }
    //       const [satOffCount] = await attendanceConnection.execute(
    //         `SELECT COUNT(*) AS count FROM leaverequest_form
    //          WHERE Employee_id = ? AND leaveTypes = 'Saturday Off'
    //          AND MONTH(startDate) = ? AND YEAR(startDate) = ?`,
    //         [Employee_id, currentMonth, currentYear]
    //       );
    //       if (satOffCount[0].count >= (rules?.saturday_off || 0)) {
    //         return res.status(400).json({
    //           status: "Error",
    //           message: `Saturday Off limit reached for this month.`,
    //         });
    //       }
    //     }
    //   } catch (error) {
    //     console.log(error);
    //     // If rules table doesn't exist but it's not a Permission leave
    //     if (leaveTypes !== "Permission") {
    //       return res.status(500).json({
    //         status: "Error",
    //         message: "System configuration error. Please contact admin.",
    //       });
    //     }
    //   }
    // }
    // No Overlapping Leaves (including Permission)
    const [overlapCheck] = await attendanceConnection.execute(
      `SELECT 1 FROM leaverequest_form 
       WHERE Employee_id = ? AND status != 'Rejected' AND (
         (startDate <= ? AND endDate >= ?) OR 
         (startDate <= ? AND endDate >= ?)
       )`,
      [Employee_id, endDate, endDate, startDate, startDate]
    );

    if (overlapCheck.length > 0) {
      return res.status(400).json({
        status: "Error",
        message: "Leave already applied for one or more selected dates.",
      });
    }

    // Leave Duration Calculation
    let noOfDays = 0;
    if (leaveTypes === "Permission") {
      // Permission leaves don't count as days
      noOfDays = 0;
    } else {
      noOfDays = (end - start) / (1000 * 3600 * 24) + 1;
      if (startDate === endDate) {
        if (leaveTimes === "Full Day") noOfDays = 1;
        else if (leaveTimes === "Halfday") noOfDays = 0.5;
      } else if (leaveTimes === "Halfday") {
        noOfDays -= 0.5;
      }
    }
    // Insert leave
    const [result] = await attendanceConnection.execute(
      `INSERT INTO leaverequest_form 
       (Employee_id, userName, leaveTypes, leaveTimes,leaveTimingCategory,startDate, endDate, reason, noOfDays, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?,?, 'Pending')`,
      [
        Employee_id,
        userName,
        leaveTypes,
        leaveTimes,
        leaveTimingCategory,
        startDate,
        endDate,
        reason,
        noOfDays,
      ]
    );
    return res.status(200).json({
      status: "Success",
      message: "Leave applied successfully.",
      data: {
        insertedId: result.insertId,
      },
    });
  } catch (error) {
    console.error("Error applying leave:", error);
    res.status(500).json({
      status: "Error",
      message: "An error occurred while applying leave.",
      error: error.message,
    });
  }
};

//employee get
exports.getLeaveApplications = async (req, res, next) => {
  const { Employee_id, startDate, endDate } = req.body;

  try {
    // Validate input
    if (!Employee_id) {
      return res
        .status(400)
        .send({ status: "Error", message: "Employee ID is required" });
    }
    if (!startDate || !endDate) {
      // Use startDate and endDate here
      return res.status(400).send({
        status: "Error",
        message: "Both startDate and endDate are required",
      });
    }

    // Build SQL query with filters
    let sql = `
      SELECT * FROM leaverequest_form
      WHERE Employee_id = ?
      AND startDate >= ? 
      AND endDate <= ?
    `;

    const params = [Employee_id, startDate, endDate];

    const [results] = await attendanceConnection.execute(sql, params);

    res.send({ status: "Success", data: results });
  } catch (error) {
    next(error);
  }
};

//admin get
/* exports.getLeaveRequestsAll = async (req, res, next) => {
  const { fromDate, toDate } = req.body;

  try {
    if (!fromDate || !toDate) {
      return res.status(400).json({
        status: "Error",
        message: "Missing required parameters: fromDate or toDate",
      });
    }

    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);

    if (isNaN(fromDateObj) || isNaN(toDateObj)) {
      return res.status(400).json({
        status: "Error",
        message: "Invalid date format. Please provide valid dates.",
      });
    }

    // Fetch leave requests from 'leaverequest_form' table in the 'attendanceConnection' database
    const fetchLeaveRequestsQuery = `
      SELECT 
        *
      FROM 
        leaverequest_form lr
      WHERE 
        lr.createdAt BETWEEN ? AND ?
    `;

    const [leaveRequests] = await attendanceConnection.execute(fetchLeaveRequestsQuery, [fromDateObj, toDateObj]);

    if (leaveRequests.length === 0) {
      return res.status(404).json({
        status: "Error",
        message: "No leave requests found in the given date range",
      });
    }

    // Fetch employee names from the 'tbl_userDetails' table in the 'connection' database
    const fetchEmployeeNamesQuery = `
      SELECT 
        employeeId, 
        name AS employeeName 
      FROM 
        tbl_userDetails
    `;

    const [employeeDetails] = await connection.execute(fetchEmployeeNamesQuery);
  console.log("employeeDetails",employeeDetails)
    
  // Create a map of Employee_id to employeeName
    const employeeMap = employeeDetails.reduce((acc, employee) => {
      acc[employee.Employee_id] = employee.employeeName;
      return acc;
    }, {});

    // Merge employee name into leaveRequests
    leaveRequests.forEach((leave) => {
      leave.employeeName = employeeMap[leave.employeeName] || "Unknown"; // Default to "Unknown" if employee is not found
    });
    console.log("employeeMap",employeeMap)

    // Return the merged result
    res.status(200).json({
      status: "Success",
      message: "Leave requests retrieved successfully",
      data: leaveRequests,
    });

  } catch (error) {
    next(error);
  }
};
 */
exports.getLeaveRequestsAll = async (req, res, next) => {
  const { startDate, endDate, employeeId } = req.body;

  try {
    if (!startDate || !endDate) {
      return res.status(400).json({
        status: "Error",
        message: "Missing required parameters: startDate or endDate",
      });
    }

    // Format dates to YYYY-MM-DD
    const formattedStartDate = new Date(startDate).toISOString().split("T")[0];
    const formattedEndDate = new Date(endDate).toISOString().split("T")[0];

    // Build SQL query with optional employee filter
    let fetchLeaveRequestsQuery = `
      SELECT * FROM leaverequest_form lr
      WHERE DATE(lr.startDate) <= ? AND DATE(lr.endDate) >= ?
    `;
    const queryParams = [formattedEndDate, formattedStartDate];

    if (employeeId) {
      fetchLeaveRequestsQuery += ` AND lr.Employee_id = ?`;
      queryParams.push(employeeId);
    }

    // Fetch leave requests
    const [leaveRequests] = await attendanceConnection.execute(
      fetchLeaveRequestsQuery,
      queryParams
    );

    if (leaveRequests.length === 0) {
      return res.send({
        status: "Error",
        message: "No leave requests found for the given filter",
      });
    }

    // Fetch employee names
    const fetchEmployeeNamesQuery = `
      SELECT employeeId, name AS employeeName 
      FROM tbl_userdetails;
    `;

    const [employeeDetails] = await attendanceConnection.execute(
      fetchEmployeeNamesQuery
    );

    // Map employeeId to name
    const employeeMap = employeeDetails.reduce((acc, emp) => {
      acc[emp.employeeId] = emp.employeeName;
      return acc;
    }, {});

    // Add employeeName and leaveDuration
    leaveRequests.forEach((leave) => {
      leave.employeeName = employeeMap[leave.Employee_id] || "Unknown";

      if (leave.leaveTimes && typeof leave.leaveTimes === "string") {
        const val = leave.leaveTimes.toLowerCase().trim();
        if (val === "half day") {
          leave.leaveDuration = 0.5;
        } else if (val === "full day") {
          leave.leaveDuration = 1;
        } else {
          const parsed = parseFloat(val);
          leave.leaveDuration = isNaN(parsed) ? 0 : parsed;
        }
      } else {
        leave.leaveDuration = 0;
      }
    });

    // Send response
    res.status(200).json({
      status: "Success",
      message: "Leave requests retrieved successfully",
      data: leaveRequests,
    });
  } catch (error) {
    console.error("Error in getLeaveRequestsAll:", error);
    res.status(500).send({
      status: "Error",
      message: "Failed to retrieve leave requests",
      data: error.message || error,
    });
  }
};

exports.updateLeaveStatus = async (req, res, next) => {
  const { leaveId, status, remarks } = req.body; // 'remarks' in the payload

  try {
    if (!leaveId || !status) {
      return res.status(400).json({
        status: "Error",
        message: "Missing required parameters: leaveId or status",
      });
    }

    const allowedStatuses = ["Accepted", "Rejected", "Pending"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "Error",
        message: `Invalid status. Allowed values are: ${allowedStatuses.join(
          ", "
        )}`,
      });
    }

    let updateLeaveQuery;
    let queryParams;

    const currentDate = new Date();

    if (status === "Accepted") {
      // For Accepted status, we keep the 'remarks' column as is
      updateLeaveQuery = `
        UPDATE leaverequest_form 
        SET status = ?, acceptDate = ?, rejectReason = ? 
        WHERE lid = ?
      `;
      queryParams = [
        status,
        currentDate,
        remarks !== undefined ? remarks : null,
        leaveId,
      ];
    } else if (status === "Rejected") {
      // For Rejected status, save the 'remarks' field into 'rejectReason' column
      updateLeaveQuery = `
        UPDATE leaverequest_form 
        SET status = ?, rejectReason = ? 
        WHERE lid = ?
      `;
      queryParams = [status, remarks !== undefined ? remarks : null, leaveId];
    } else {
      // For Pending or any other status, store 'remarks' as 'rejectReason'
      updateLeaveQuery = `
        UPDATE leaverequest_form 
        SET status = ?, rejectReason = ? 
        WHERE lid = ?
      `;
      queryParams = [status, remarks !== undefined ? remarks : null, leaveId];
    }

    const [result] = await attendanceConnection.execute(
      updateLeaveQuery,
      queryParams
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ status: "Error", message: "Leave request not found" });
    }

    res.status(200).json({
      status: "Success",
      message: "Leave status updated successfully",
      data: {
        leaveId,
        updatedStatus: status,
        rejectReason: remarks,
        acceptDate: status === "Accepted" ? currentDate : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateLeaveStatus1 = async (req, res, next) => {
  const { leaveIds, status, remarks } = req.body;

  try {
    // Validate input
    if (!leaveIds || !Array.isArray(leaveIds) || leaveIds.length === 0) {
      return res.status(400).send({
        status: "Error",
        message: "Leave IDs must be provided in an array",
      });
    }

    // Update the leave application status
    const sql = `
      UPDATE tbl_leave_applications 
      SET status = ?, remarks = ?, acceptdate = NOW()
      WHERE lid IN (?)
    `;

    // Use parameterized query for IN clause
    await connection.execute(sql, [status, remarks || null, leaveIds]);

    res.send({
      status: "Success",
      message: "Leave application statuses updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getEmployeeLeaveReport = async (req, res, next) => {
  const { employeeId } = req.params;

  try {
    if (!employeeId) {
      return res
        .status(400)
        .send({ status: "Error", message: "Employee ID is required" });
    }

    const sql = `
      SELECT * FROM tbl_leave_applications 
      WHERE employeeId = ?
    `;

    const [results] = await connection.execute(sql, [employeeId]);

    res.send({ status: "Success", data: results });
  } catch (error) {
    next(error);
  }
};
// File: controllers/attendanceController.js (or similar)

exports.create_event = async (req, res) => {
  const {
    eventType,
    eventName,
    description,
    eventStartDate,
    eventEndDate,
    noOfDays,
    photoUrl,
    isActive,
  } = req.body;

  console.log("Received request body:", req.body);

  // Validate required fields
  if (
    !eventType ||
    !eventName ||
    !description ||
    !eventStartDate ||
    !eventEndDate ||
    !noOfDays
  ) {
    return res
      .status(400)
      .json({ status: "Error", message: "Missing required fields" });
  }

  const createdAt = new Date();
  const updatedAt = new Date();

  const sql = `
    INSERT INTO attendance_register.tbl_events 
    (eventType, eventName, description, eventStartDate, eventEndDate, noOfDays, photoUrl, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    eventType,
    eventName,
    description,
    eventStartDate,
    eventEndDate,
    noOfDays,
    photoUrl || "",
    isActive ?? 1,
    createdAt,
    updatedAt,
  ];

  try {
    const [result] = await attendanceConnection.execute(sql, values);

    return res.status(200).json({
      status: "Success",
      message: "Event created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("❌ Insert error:", err);
    return res
      .status(500)
      .json({ status: "Error", message: "Database insert failed" });
  }
};

// exports.dailypunch = async (req, res) => {
//     const { from_date, to_date } = req.body;

//     try {
//         let query = '';
//         let params = [];

//         if (from_date && to_date) {
//             // If date range is provided
//             query = `SELECT * FROM tbl_dailypunch WHERE CAST(createdAt AS DATE) BETWEEN ? AND ?`;
//             params = [from_date, to_date];
//         } else {
//             // Default to today's data
//             query = `SELECT * FROM tbl_dailypunch WHERE CAST(createdAt AS DATE) = CURRENT_DATE`;
//         }

//         const [rows] = await attendanceConnection.execute(query, params);
//         res.json(rows);
//     } catch (error) {
//         console.error('Error fetching data:', error);
//         res.status(500).send('Server error');
//     }
// };
exports.dailypunch = async (req, res) => {
  const { date, from_date, to_date } = req.body;

  try {
    let query = "";
    let params = [];

    if (date) {
      query = `SELECT * FROM tbl_dailypunch WHERE CAST(logTime AS DATE) = ?`;
      params = [date];
    } else if (from_date && to_date) {
      query = `SELECT * FROM tbl_dailypunch WHERE CAST(logTime AS DATE) BETWEEN ? AND ?`;
      params = [from_date, to_date];
    } else {
      // Handle the case where neither date nor range is provided
      return res.status(400).send("Please provide a valid date or date range");
    }

    const [rows] = await attendanceConnection.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server error");
  }
};
// exports.dailypunch1 = async (req, res) => {
//   const { date, from_date, to_date, employeeId, punchType } = req.body;

//   try {
//     //get rules
//     const rulesQuery = "SELECT * FROM rules_master";
//     const [rulesResult] = await attendanceConnection.execute(rulesQuery);
//     const rules = rulesResult || {};
//     // First get the raw punch data
//     let baseQuery = "SELECT * FROM tbl_dailypunch";
//     let conditions = [];
//     let params = [];

//     // Date filtering
//     if (date) {
//       conditions.push("CAST(logTime AS DATE) = ?");
//       params.push(date);
//     } else if (from_date && to_date) {
//       conditions.push("CAST(logTime AS DATE) BETWEEN ? AND ?");
//       params.push(from_date, to_date);
//     } else {
//       return res.status(400).send("Please provide a valid date or date range");
//     }

//     // Employee filter
//     if (employeeId) {
//       conditions.push("employeeId = ?");
//       params.push(employeeId);
//     }

//     // Punch type filter (only if not "Late Punches")
//     if (punchType && punchType !== "Late Punches") {
//       conditions.push("logType = ?");
//       params.push(punchType);
//     }

//     // Build the final query
//     if (conditions.length > 0) {
//       baseQuery += " WHERE " + conditions.join(" AND ");
//     }

//     // Add sorting by logSno
//     baseQuery += " ORDER BY logSno ASC";

//     const [rows] = await attendanceConnection.execute(baseQuery, params);

//     // Get employee list for names
//     const [employees] = await attendanceConnection.execute("SELECT employeeId, name FROM tbl_userdetails");
//     const employeeMap = employees.reduce((acc, emp) => {
//       acc[emp.employeeId] = emp.name;
//       return acc;
//     }, {});

//     // Get permission leaves (both Accepted and Pending)
//     const [leaves] = await attendanceConnection.execute(
//       `SELECT
//         Employee_id,
//         leaveTimes,
//         leaveTypes,
//         status,
//         startDate,
//         endDate
//        FROM leaverequest_form
//        WHERE leaveTypes = 'Permission'
//        AND status IN ('Accepted', 'Pending')`
//     );

//     // Group the data as frontend expects
//     const groupedData = {};

//     rows.forEach((row) => {
//       const dateStr = new Date(row.logTime).toLocaleDateString("en-GB");
//       const dateObj = new Date(row.logTime);
//       dateObj.setHours(0, 0, 0, 0); // Normalize date for comparison
//       const key = `${row.employeeId}-${dateStr}`;

//       if (!groupedData[key]) {
//         groupedData[key] = {
//           key,
//           id: row.id,
//           employeeId: row.employeeId,
//           employeeName: employeeMap[row.employeeId] || row.employeeId,
//           place: row.place1,
//           date: dateStr,
//           punchIn: [],
//           punchOut: [],
//           device: row.device,
//           dateObj: dateObj,
//         };
//       }

//       if (row.logType === "In") {
//         groupedData[key].punchIn.push(row.logTime);
//       } else if (row.logType === "Out") {
//         groupedData[key].punchOut.push(row.logTime);
//       }
//     });

//     // Calculate all the derived fields like frontend does
//     const result = Object.values(groupedData).map((item) => {
//       // console.log("Processing item:", item);
//       const inTimes = item.punchIn.map((time) => new Date(time));
//       const outTimes = item.punchOut.map((time) => (time ? new Date(time) : null)).filter((t) => t !== null);

//       let totalHoursFormatted = "0 hr 0 min";
//       let netWorkingHoursFormatted = "0 hr 0 min";
//       let breakHoursFormatted = "0 hr 0 min";
//       let lateInFormatted = "";
//       let earlyOutFormatted = "";

//       // Late in calculation with permission leave adjustment
//       if (inTimes.length > 0) {
//         const firstPunchRaw = new Date(Math.min(...inTimes.map((t) => t.getTime())));
//         const firstPunch = new Date(firstPunchRaw);
//         firstPunch.setSeconds(0);
//         firstPunch.setMilliseconds(0);

//         const lateThreshold = new Date(firstPunch);

//         const firstPunchDate = moment(lateThreshold).format("YYYY-MM-DD");

//         // Step 1: Filter rules where validFrom <= firstPunchDate
//         const applicableRules = rules.filter((rule) => {
//           const validFrom = moment(rule.validFrom).format("YYYY-MM-DD");
//           return validFrom <= firstPunchDate;
//         });

//         // Step 2: Get the rule with the most recent validFrom
//         const latestApplicableRule = applicableRules.reduce((latest, current) => {
//           const latestDate = moment(latest.validFrom).format("YYYY-MM-DD");
//           const currentDate = moment(current.validFrom).format("YYYY-MM-DD");
//           return currentDate > latestDate ? current : latest;
//         }, applicableRules[0]);

//         let [hours, minutes, seconds] = latestApplicableRule.officeStartTime.split(":").map(Number);

//         lateThreshold.setHours(hours, minutes, seconds, 0);

//         // lateThreshold.setHours(9, 30, 0, 0);

//         if (firstPunch > lateThreshold) {
//           let lateDiffMs = firstPunch - lateThreshold;

//           // Find applicable permission leaves for this employee on this date
//           const applicableLeaves = leaves.filter((leave) => {
//             return leave.Employee_id === item.employeeId && item.dateObj >= new Date(leave.startDate) && item.dateObj <= new Date(leave.endDate);
//           });

//           // Calculate total permission seconds (using the same logic as get_late_punch)
//           let permissionSeconds = 0;
//           applicableLeaves.forEach((leave) => {
//             if (leave.leaveTimes.includes("hour")) {
//               const hours = parseInt(leave.leaveTimes) || 0;
//               permissionSeconds += hours * 3600;
//             }
//           });

//           // Adjust for permission leaves (convert to milliseconds)
//           lateDiffMs -= permissionSeconds * 1000;

//           // Only show late time if still late after adjustment
//           if (lateDiffMs > 0) {
//             const lateDiffMinutes = Math.floor(lateDiffMs / (1000 * 60));
//             const lateHours = Math.floor(lateDiffMinutes / 60);
//             const lateMinutes = lateDiffMinutes % 60;
//             lateInFormatted = `${lateHours} hr ${lateMinutes} min`;
//           }
//         }
//       }

//       // Working hours calculation
//       if (inTimes.length > 0 && outTimes.length > 0) {
//         if (inTimes.length === outTimes.length) {
//           if (inTimes.length === 1) {
//             const firstPunch = new Date(Math.min(...inTimes.map((t) => t.getTime())));
//             const lastPunch = outTimes[0];
//             const totalMs = lastPunch - firstPunch;
//             const totalMinutes = Math.round(totalMs / (1000 * 60));
//             const totalHours = Math.floor(totalMinutes / 60);
//             const remainingMinutes = totalMinutes % 60;
//             totalHoursFormatted = `${totalHours} hr ${remainingMinutes} min`;
//             breakHoursFormatted = "0 hr 0 min";
//             netWorkingHoursFormatted = totalHoursFormatted;
//           } else {
//             const firstPunch = new Date(Math.min(...inTimes.map((t) => t.getTime())));
//             const lastPunch = new Date(Math.max(...outTimes.map((t) => t.getTime())));
//             const totalMs = lastPunch - firstPunch;
//             const totalMinutes = Math.round(totalMs / (1000 * 60));
//             const totalHours = Math.floor(totalMinutes / 60);
//             const remainingMinutes = totalMinutes % 60;
//             totalHoursFormatted = `${totalHours} hr ${remainingMinutes} min`;

//             let breakMinutes = 0;
//             let events = [];
//             item.punchIn.forEach((time) => {
//               events.push({ time: new Date(time), type: "In" });
//             });
//             item.punchOut.forEach((time) => {
//               if (time) {
//                 events.push({ time: new Date(time), type: "Out" });
//               }
//             });
//             events.sort((a, b) => a.time - b.time);
//             for (let i = 0; i < events.length - 1; i++) {
//               if (events[i].type === "Out" && events[i + 1].type === "In") {
//                 const diff = (events[i + 1].time - events[i].time) / (1000 * 60);
//                 if (diff > 0) {
//                   breakMinutes += diff;
//                 }
//               }
//             }
//             const breakHrs = Math.floor(breakMinutes / 60);
//             const breakRemaining = Math.round(breakMinutes % 60);
//             breakHoursFormatted = `${breakHrs} hr ${breakRemaining} min`;

//             const netMinutes = totalMinutes - breakMinutes;
//             const netHours = Math.floor(netMinutes / 60);
//             const netRemaining = Math.round(netMinutes % 60);
//             netWorkingHoursFormatted = `${netHours} hr ${netRemaining} min`;
//           }

//           // Early out calculation
//           const lastPunch = new Date(Math.max(...outTimes.map((t) => t.getTime())));
//           const earlyOutThreshold = new Date(lastPunch);

//           const lastPunchDate = moment(earlyOutThreshold).format("YYYY-MM-DD");

//           // Step 1: Filter rules where validFrom <= firstPunchDate
//           const applicableRules = rules.filter((rule) => {
//             const validFrom = moment(rule.validFrom).format("YYYY-MM-DD");
//             return validFrom <= lastPunchDate;
//           });

//           // Step 2: Get the rule with the most recent validFrom
//           const latestApplicableRule = applicableRules.reduce((latest, current) => {
//             const latestDate = moment(latest.validFrom).format("YYYY-MM-DD");
//             const currentDate = moment(current.validFrom).format("YYYY-MM-DD");
//             return currentDate > latestDate ? current : latest;
//           }, applicableRules[0]);

//           let [hours, minutes, seconds] = latestApplicableRule.officeEndTime.split(":").map(Number);

//           earlyOutThreshold.setHours(hours, minutes, seconds, 0);

//           // earlyOutThreshold.setHours(18, 30, 0, 0);
//           if (lastPunch < earlyOutThreshold) {
//             const earlyDiffMs = earlyOutThreshold - lastPunch;
//             const earlyDiffMinutes = Math.round(earlyDiffMs / (1000 * 60));
//             const earlyHours = Math.floor(earlyDiffMinutes / 60);
//             const earlyMinutes = earlyDiffMinutes % 60;
//             earlyOutFormatted = `${earlyHours} hr ${earlyMinutes} min`;
//           }
//         }
//       }

//       return {
//         ...item,
//         totalHours: totalHoursFormatted,
//         breakHours: breakHoursFormatted,
//         netWorkingHours: netWorkingHoursFormatted,
//         lateIn: lateInFormatted,
//         earlyOut: earlyOutFormatted,
//       };
//     });

//     res.json(result);
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     res.status(500).send("Server error");
//   }
// };

// POST /getSinglePunch
exports.dailypunch1 = async (req, res) => {
  const { date, from_date, to_date, employeeId, punchType } = req.body;

  try {
    //get rules
    const rulesQuery = "SELECT * FROM rules_master";
    const [rulesResult] = await attendanceConnection.execute(rulesQuery);
    const rules = rulesResult || {};

    // First get the raw punch data
    let baseQuery = "SELECT * FROM tbl_dailypunch";
    let conditions = [];
    let params = [];

    // Date filtering
    if (date) {
      conditions.push("CAST(logTime AS DATE) = ?");
      params.push(date);
    } else if (from_date && to_date) {
      conditions.push("CAST(logTime AS DATE) BETWEEN ? AND ?");
      params.push(from_date, to_date);
    } else {
      return res.status(400).send("Please provide a valid date or date range");
    }

    // Employee filter
    if (employeeId) {
      conditions.push("employeeId = ?");
      params.push(employeeId);
    }

    // Punch type filter (only if not "Late Punches")
    if (punchType && punchType !== "Late Punches") {
      conditions.push("logType = ?");
      params.push(punchType);
    }

    // Build the final query
    if (conditions.length > 0) {
      baseQuery += " WHERE " + conditions.join(" AND ");
    }

    // Add sorting by logSno
    baseQuery += " ORDER BY logSno ASC";

    const [rows] = await attendanceConnection.execute(baseQuery, params);

    // Get employee list for names
    const [employees] = await attendanceConnection.execute(
      "SELECT employeeId, name FROM tbl_userdetails"
    );
    const employeeMap = employees.reduce((acc, emp) => {
      acc[emp.employeeId] = emp.name;
      return acc;
    }, {});

    // Get permission leaves (both Accepted and Pending)
    const [leaves] = await attendanceConnection.execute(
      `SELECT 
        Employee_id, 
        leaveTimes, 
        leaveTypes,
        status,
        startDate,
        endDate
       FROM leaverequest_form 
       WHERE leaveTypes = 'Permission' 
       AND status IN ('Accepted', 'Pending')`
    );

    // Group the data
    const groupedData = {};

    rows.forEach((row) => {
      const dateStr = new Date(row.logTime).toLocaleDateString("en-GB");
      const dateObj = new Date(row.logTime);
      dateObj.setHours(0, 0, 0, 0); // Normalize date for comparison
      const key = `${row.employeeId}-${dateStr}`;

      if (!groupedData[key]) {
        groupedData[key] = {
          key,
          id: row.id,
          employeeId: row.employeeId,
          employeeName: employeeMap[row.employeeId] || row.employeeId,
          place: row.place1,
          date: dateStr,
          punchIn: [],
          punchOut: [],
          device: row.device,
          dateObj: dateObj,
        };
      }

      if (row.logType === "In") {
        groupedData[key].punchIn.push(row.logTime);
      } else if (row.logType === "Out") {
        groupedData[key].punchOut.push(row.logTime);
      }
    });

    // Calculate derived fields
    const result = Object.values(groupedData).map((item) => {
      const inTimes = item.punchIn.map((time) => new Date(time));
      const outTimes = item.punchOut
        .map((time) => (time ? new Date(time) : null))
        .filter((t) => t !== null);

      let totalHoursFormatted = "0 hr 0 min";
      let netWorkingHoursFormatted = "0 hr 0 min";
      let breakHoursFormatted = "0 hr 0 min";
      let lateInFormatted = "";
      let earlyOutFormatted = "";

      // Late in calculation
      if (inTimes.length > 0) {
        const firstPunchRaw = new Date(
          Math.min(...inTimes.map((t) => t.getTime()))
        );
        const firstPunch = new Date(firstPunchRaw);
        firstPunch.setSeconds(0);
        firstPunch.setMilliseconds(0);

        const lateThreshold = new Date(firstPunch);
        const firstPunchDate = moment(lateThreshold).format("YYYY-MM-DD");

        const applicableRules = rules.filter((rule) => {
          const validFrom = moment(rule.validFrom).format("YYYY-MM-DD");
          return validFrom <= firstPunchDate;
        });

        const latestApplicableRule = applicableRules.reduce(
          (latest, current) => {
            const latestDate = moment(latest.validFrom).format("YYYY-MM-DD");
            const currentDate = moment(current.validFrom).format("YYYY-MM-DD");
            return currentDate > latestDate ? current : latest;
          },
          applicableRules[0]
        );

        let [hours, minutes, seconds] = latestApplicableRule.officeStartTime
          .split(":")
          .map(Number);
        lateThreshold.setHours(hours, minutes, seconds, 0);

        if (firstPunch > lateThreshold) {
          let lateDiffMs = firstPunch - lateThreshold;

          const applicableLeaves = leaves.filter((leave) => {
            return (
              leave.Employee_id === item.employeeId &&
              item.dateObj >= new Date(leave.startDate) &&
              item.dateObj <= new Date(leave.endDate)
            );
          });

          let permissionSeconds = 0;
          applicableLeaves.forEach((leave) => {
            if (leave.leaveTimes.includes("hour")) {
              const hours = parseInt(leave.leaveTimes) || 0;
              permissionSeconds += hours * 3600;
            }
          });

          lateDiffMs -= permissionSeconds * 1000;

          if (lateDiffMs > 0) {
            const lateDiffMinutes = Math.floor(lateDiffMs / (1000 * 60));
            const lateHours = Math.floor(lateDiffMinutes / 60);
            const lateMinutes = lateDiffMinutes % 60;
            lateInFormatted = `${lateHours} hr ${lateMinutes} min`;
          }
        }
      }

      // Working hours + early out
      if (inTimes.length > 0 && outTimes.length > 0) {
        const firstPunch = new Date(
          Math.min(...inTimes.map((t) => t.getTime()))
        );
        const lastPunch = new Date(
          Math.max(...outTimes.map((t) => t.getTime()))
        );

        const totalMs = lastPunch - firstPunch;
        const totalMinutes = Math.round(totalMs / (1000 * 60));
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        totalHoursFormatted = `${totalHours} hr ${remainingMinutes} min`;

        // Calculate break time
        let breakMinutes = 0;
        let events = [];
        item.punchIn.forEach((time) =>
          events.push({ time: new Date(time), type: "In" })
        );
        item.punchOut.forEach(
          (time) => time && events.push({ time: new Date(time), type: "Out" })
        );
        events.sort((a, b) => a.time - b.time);
        for (let i = 0; i < events.length - 1; i++) {
          if (events[i].type === "Out" && events[i + 1].type === "In") {
            const diff = (events[i + 1].time - events[i].time) / (1000 * 60);
            if (diff > 0) breakMinutes += diff;
          }
        }
        const breakHrs = Math.floor(breakMinutes / 60);
        const breakRemaining = Math.round(breakMinutes % 60);
        breakHoursFormatted = `${breakHrs} hr ${breakRemaining} min`;

        const netMinutes = totalMinutes - breakMinutes;
        const netHours = Math.floor(netMinutes / 60);
        const netRemaining = Math.round(netMinutes % 60);
        netWorkingHoursFormatted = `${netHours} hr ${netRemaining} min`;

        // 🧠 EARLY OUT CALCULATION
        const dayOfWeek = item.dateObj.getDay(); // 6 = Saturday
        if (dayOfWeek !== 6) {
          // ✅ Ignore EarlyOut for Saturday
          const earlyOutThreshold = new Date(lastPunch);
          const lastPunchDate = moment(earlyOutThreshold).format("YYYY-MM-DD");

          const applicableRules = rules.filter((rule) => {
            const validFrom = moment(rule.validFrom).format("YYYY-MM-DD");
            return validFrom <= lastPunchDate;
          });

          const latestApplicableRule = applicableRules.reduce(
            (latest, current) => {
              const latestDate = moment(latest.validFrom).format("YYYY-MM-DD");
              const currentDate = moment(current.validFrom).format(
                "YYYY-MM-DD"
              );
              return currentDate > latestDate ? current : latest;
            },
            applicableRules[0]
          );

          let [hours, minutes, seconds] = latestApplicableRule.officeEndTime
            .split(":")
            .map(Number);
          earlyOutThreshold.setHours(hours, minutes, seconds, 0);

          if (lastPunch < earlyOutThreshold) {
            const earlyDiffMs = earlyOutThreshold - lastPunch;
            const earlyDiffMinutes = Math.round(earlyDiffMs / (1000 * 60));
            const earlyHours = Math.floor(earlyDiffMinutes / 60);
            const earlyMinutes = earlyDiffMinutes % 60;
            earlyOutFormatted = `${earlyHours} hr ${earlyMinutes} min`;
          }
        } else {
          // For Saturday — no EarlyOut
          earlyOutFormatted = "";
        }
      }

      return {
        ...item,
        totalHours: totalHoursFormatted,
        breakHours: breakHoursFormatted,
        netWorkingHours: netWorkingHoursFormatted,
        lateIn: lateInFormatted,
        earlyOut: earlyOutFormatted,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server error");
  }
};

exports.getSinglePunch = async (req, res) => {
  const { employeeId, fromDate, toDate, id } = req.body;

  if (!employeeId || !fromDate || !toDate) {
    return res.status(400).json({
      status: "Error",
      message: "employeeId, fromDate, and toDate are required",
    });
  }

  try {
    let query = `
      SELECT * FROM tbl_dailypunch 
      WHERE employeeId = ? 
      AND DATE(logTime) BETWEEN ? AND ?
    `;
    const params = [employeeId, fromDate, toDate];

    if (id) {
      query += ` AND id = ?`;
      params.push(id);
    }

    const [rows] = await attendanceConnection.execute(query, params);

    if (!rows || rows.length === 0) {
      return res
        .status(200)
        .json({ status: "Error", message: "No punch records found" });
    }

    res.json(rows);
  } catch (error) {
    console.error("Error fetching punch data:", error);
    res.status(500).json({ status: "Error", message: "Server error" });
  }
};

exports.updateMultipleRefTimes = async (req, res) => {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res
      .status(400)
      .json({ status: "Error", message: "Invalid or empty updates array" });
  }

  const conn = await attendanceConnection.getConnection();

  try {
    await conn.beginTransaction();

    for (const update of updates) {
      const { id, refTime } = update;

      if (!id || !refTime) {
        await conn.rollback();
        return res.status(400).json({
          status: "Error",
          message: `Missing id or refTime in update entry: ${JSON.stringify(
            update
          )}`,
        });
      }

      // Step 1: Get existing logTime for date extraction
      const [rows] = await conn.execute(
        `SELECT logTime FROM tbl_dailypunch WHERE id = ?`,
        [id]
      );

      if (rows.length === 0) {
        await conn.rollback();
        return res
          .status(404)
          .json({ status: "Error", message: `Punch with id ${id} not found` });
      }

      const originalLogTime = rows[0].logTime; // e.g., "2025-07-25T08:23:00.000Z"
      const logDate = new Date(originalLogTime).toISOString().split("T")[0]; // "2025-07-25"
      const newLogTime = `${logDate} ${refTime}`; // e.g., "2025-07-25 09:20:00"

      // Step 2: Update with correct datetime format
      const [result] = await conn.execute(
        `UPDATE tbl_dailypunch
         SET refTime = ?, logTime = ?, updatedAt = NOW()
         WHERE id = ?`,
        [refTime, newLogTime, id]
      );

      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({
          status: "Error",
          message: `Punch with id ${id} not updated`,
        });
      }
    }

    await conn.commit();
    return res.status(200).json({
      status: "Success",
      message: "All refTime and logTime values updated successfully",
    });
  } catch (error) {
    await conn.rollback();
    console.error("❌ Bulk update error:", error.message);
    return res.status(500).json({
      status: "Error",
      message: "Server error during bulk update",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};
exports.updateOrInsertPunches = async (req, res) => {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res
      .status(400)
      .json({ status: "Error", message: "Choose employee Name" });
  }

  const conn = await attendanceConnection.getConnection();

  try {
    await conn.beginTransaction();

    for (const update of updates) {
      const { id, employeeId, refTime, logType, place1, device, createdAt } =
        update;

      if (employeeId === "" || !refTime || !logType) {
        await conn.rollback();
        return res.status(200).json({
          status: "Error",
          message: `Missing required fields in update entry: ${JSON.stringify(
            update
          )}`,
        });
      }

      // Use passed createdAt date or default to today's IST date
      const baseDate = createdAt
        ? moment.tz(createdAt, "YYYY-MM-DD", "Asia/Kolkata")
        : moment.tz("Asia/Kolkata");

      const logTimeIST = moment.tz(
        `${baseDate.format("YYYY-MM-DD")}T${refTime}`,
        "Asia/Kolkata"
      );

      const logTime = logTimeIST.toDate(); // UTC log time
      const timeStr = logTimeIST.format("HH:mm:ss"); // refTime
      const dateStr = logTimeIST.format("YYYY-MM-DD"); // used for sno

      if (id) {
        // === Try to UPDATE if ID exists ===
        const [rows] = await conn.execute(
          `SELECT id FROM tbl_dailypunch WHERE id = ?`,
          [id]
        );
        if (rows.length > 0) {
          await conn.execute(
            `UPDATE tbl_dailypunch
             SET refTime = ?, logTime = ?, logType = ?, place1 = ?, device = ?, updatedAt = NOW()
             WHERE id = ?`,
            [timeStr, logTime, logType, place1 || "", device || "Manual", id]
          );
          continue;
        }
      }

      // === INSERT New Record if ID not found ===

      // Get next logSno for the day
      const [snoResult] = await conn.execute(
        `SELECT MAX(logSno) AS maxSno FROM tbl_dailypunch
         WHERE employeeId = ? AND DATE(logTime) = ?`,
        [employeeId, dateStr]
      );
      const nextSno = (snoResult[0].maxSno || 0) + 1;

      await conn.execute(
        `INSERT INTO tbl_dailypunch 
         (employeeId, logType, refTime, logTime, logSno, place1, device, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          employeeId,
          logType,
          timeStr,
          logTime,
          nextSno,
          place1 || "",
          device || "Manual",
          logTime, // createdAt same as logTime
        ]
      );
    }

    await conn.commit();
    return res.status(200).json({
      status: "Success",
      message: "Punches updated or inserted successfully",
    });
  } catch (error) {
    await conn.rollback();
    console.error("❌ updateOrInsertPunches error:", error.message);
    return res.status(500).json({
      status: "Error",
      message: "Server error during punch update/insert",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

exports.getAttendanceReport = async (req, res) => {
  const {
    year,
    fromMonth,
    toMonth,
    employeeId,
    employeeName,
    includeLeaveSummary = true,
    includeDailyDetails = true,
  } = req.body;

  try {
    // Validate inputs
    if (!year || !fromMonth || !toMonth) {
      return res.status(400).json({
        status: "Error",
        message: "Missing required parameters: year, fromMonth, or toMonth",
      });
    }

    // Calculate date range
    const startDate = moment(`${year}-${fromMonth}-01`)
      .startOf("month")
      .format("YYYY-MM-DD");
    const endDate = moment(`${year}-${toMonth}-01`)
      .endOf("month")
      .format("YYYY-MM-DD");

    // Get filtered employees
    let employeeQuery = `
      SELECT employeeId, name AS employeeName, dateOfJoining
      FROM tbl_userdetails
      WHERE isActive = '1' AND userType = 'employee'
    `;

    const employeeParams = [];

    if (employeeId) {
      employeeQuery += ` AND employeeId = ?`;
      employeeParams.push(employeeId);
    }

    if (employeeName) {
      employeeQuery += ` AND name LIKE ?`;
      employeeParams.push(`%${employeeName}%`);
    }

    employeeQuery += ` ORDER BY name ASC`;

    const [employees] = await attendanceConnection.execute(
      employeeQuery,
      employeeParams
    );

    if (employees.length === 0) {
      return res.status(200).json({
        status: "Success",
        message: "No employees found matching the criteria",
        data: {
          summary: [],
          dailyDetails: [],
        },
      });
    }

    // Get all required data in parallel
    const [holidays, leaves, punches] = await Promise.all([
      // Get holidays
      attendanceConnection.execute(
        `SELECT *, 
          DATE_FORMAT(eventStartDate, '%Y-%m-%d') AS eventStartDate,
          DATE_FORMAT(eventEndDate, '%Y-%m-%d') AS eventEndDate
         FROM tbl_events
         WHERE isActive = '1'
         AND (
           (eventStartDate BETWEEN ? AND ?)
           OR (eventEndDate BETWEEN ? AND ?)
           OR (eventStartDate <= ? AND eventEndDate >= ?)
         )`,
        [startDate, endDate, startDate, endDate, startDate, endDate]
      ),

      // Get leaves
      attendanceConnection.execute(
        `SELECT lr.*, ud.name AS employeeName
         FROM leaverequest_form lr
         JOIN tbl_userdetails ud ON lr.Employee_id = ud.employeeId
         WHERE lr.status = 'Accepted'
         AND (
           (DATE(lr.startDate) BETWEEN ? AND ?)
           OR (DATE(lr.endDate) BETWEEN ? AND ?)
           OR (DATE(lr.startDate) <= ? AND DATE(lr.endDate) >= ?)
         )`,
        [startDate, endDate, startDate, endDate, startDate, endDate]
      ),

      // Get punches
      attendanceConnection.execute(
        `SELECT employeeId, DATE(logTime) AS punchDate
         FROM tbl_dailypunch
         WHERE DATE(logTime) BETWEEN ? AND ?
         GROUP BY employeeId, DATE(logTime)`,
        [startDate, endDate]
      ),
    ]);

    // Process data for each month in the range
    const result = {
      summary: [],
      dailyDetails: [],
    };

    const startMonth = parseInt(fromMonth);
    const endMonth = parseInt(toMonth);

    for (let month = startMonth; month <= endMonth; month++) {
      const monthName = moment()
        .month(month - 1)
        .format("MMMM");
      const daysInMonth = moment(`${year}-${month}`, "YYYY-MM").daysInMonth();
      const monthStart = moment(`${year}-${month}-01`).startOf("month");
      const monthEnd = moment(`${year}-${month}-01`).endOf("month");

      const monthSummary = {
        month,
        monthName,
        year,
        employees: [],
      };

      const monthDailyDetails = {
        month,
        monthName,
        year,
        days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
        employees: [],
      };

      // Process each employee
      for (const emp of employees) {
        const employeeLeaves = leaves[0].filter(
          (l) => l.employeeName === emp.employeeName
        );
        const employeePunches = punches[0].filter(
          (p) => p.employeeName === emp.employeeName
        );

        const summary = {
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          totalWorkingDays: 0,
          totalPresent: 0,
          totalAbsent: 0,
          casualLeave: 0,
          lossOfPay: 0,
          saturdayOff: 0,
          halfDays: 0,
          workFromHome: 0,
          permission: 0,
        };

        const dailyStatus = {};

        // Check each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
          const date = moment(`${year}-${month}-${day}`);
          const dateStr = date.format("YYYY-MM-DD");

          if (date.isBefore(emp.dateOfJoining)) {
            dailyStatus[day] = "-"; // Before joining date
            continue;
          }

          if (date.isAfter(moment(), "day")) {
            dailyStatus[day] = ""; // Future date
            continue;
          }

          // Check if it's a Sunday
          if (date.day() === 0) {
            dailyStatus[day] = "S";
            continue;
          }

          // Check holidays
          const holiday = holidays[0].find(
            (h) =>
              date.isSameOrAfter(moment(h.eventStartDate), "day") &&
              date.isSameOrBefore(moment(h.eventEndDate), "day")
          );

          if (holiday) {
            dailyStatus[day] = holiday.eventName === "SAT OFF" ? "SO" : "HO";
            continue;
          }

          // Check leaves
          let leaveStatus = null;
          let isHalfDay = false;

          for (const leave of employeeLeaves) {
            if (
              date.isSameOrAfter(moment(leave.startDate), "day") &&
              date.isSameOrBefore(moment(leave.endDate), "day")
            ) {
              if (leave.leaveTypes.includes("Casual Leave")) {
                leaveStatus = "CL";
              } else if (
                leave.leaveTypes.includes("Loss of Pay") ||
                leave.leaveTypes.includes("LossofPay")
              ) {
                leaveStatus = "LOP";
              } else if (leave.leaveTypes.includes("Saturday Off")) {
                leaveStatus = "SO";
              } else if (leave.leaveTypes.includes("Work From Home")) {
                leaveStatus = "WFH";
              } else if (leave.leaveTypes.includes("Permission")) {
                leaveStatus = "PE";
              }

              // Check for half day
              if (leave.leaveTimes === "Half day" || leave.noOfDays === 0.5) {
                isHalfDay = true;
                leaveStatus += "-H";
              }

              break;
            }
          }

          if (leaveStatus) {
            dailyStatus[day] = leaveStatus;

            if (isHalfDay) {
              summary.halfDays += 0.5;
              if (leaveStatus.startsWith("CL")) summary.casualLeave += 0.5;
              if (leaveStatus.startsWith("LOP")) summary.lossOfPay += 0.5;
            } else {
              if (leaveStatus === "CL") summary.casualLeave += 1;
              if (leaveStatus === "LOP") summary.lossOfPay += 1;
              if (leaveStatus === "SO") summary.saturdayOff += 1;
              if (leaveStatus === "WFH") summary.workFromHome += 1;
              if (leaveStatus === "PE") summary.permission += 1;
            }

            continue;
          }

          // Check punch data
          const hasPunch = employeePunches.some((p) => p.punchDate === dateStr);
          if (hasPunch) {
            dailyStatus[day] = "P";
            summary.totalPresent++;
          } else {
            dailyStatus[day] = "A";
            summary.totalAbsent++;
          }
        }

        // Calculate totals
        summary.totalWorkingDays = daysInMonth;

        monthSummary.employees.push(summary);

        if (includeDailyDetails) {
          monthDailyDetails.employees.push({
            employeeId: emp.employeeId,
            employeeName: emp.employeeName,
            dailyStatus,
          });
        }
      }

      result.summary.push(monthSummary);
      if (includeDailyDetails) {
        result.dailyDetails.push(monthDailyDetails);
      }
    }

    res.status(200).json({
      status: "Success",
      message: "Attendance report generated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in getAttendanceReport:", error);
    res.status(500).json({
      status: "Error",
      message: "Failed to generate attendance report",
      error: error.message,
    });
  }
};

exports.create_employeeDesignation = async (req, res) => {
  const { designation } = req.body;
  try {
    if (!designation) {
      return res
        .status(400)
        .send({ status: "Error", message: "Employee designation is required" });
    }

    const sql = "INSERT INTO tbl_designation (designation) VALUES (?)";
    const [results] = await attendanceConnection.execute(sql, [designation]);
    console.log(results + "KK");
    res.send({ status: "Success", data: results });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server error");
  }
};

exports.getEmployeeDesignations = async (req, res) => {
  try {
    const sql = "SELECT * FROM tbl_designation where isActive='1'";
    const [results] = await attendanceConnection.execute(sql);
    res.send({ status: "Success", data: results });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server error");
  }
};

exports.updateEmployeeDesignation = async (req, res) => {
  try {
    const { designation, id } = req.body;
    if (!id) {
      return res
        .status(400)
        .send({ status: "Error", message: "Id is required" });
    }
    const sql =
      "UPDATE tbl_designation SET  designation = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    const [results] = await attendanceConnection.execute(sql, [
      designation,
      id,
    ]);
    res.send({ status: "Success", data: results });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server error");
  }
};

exports.deleteEmployeeDesignation = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res
        .status(400)
        .send({ status: "Error", message: "Id is required" });
    }
    const sql = "UPDATE tbl_designation SET  isActive='0' WHERE id = ?";
    const [results] = await attendanceConnection.execute(sql, [id]);

    const employeeId = "kst7134";
    const numericPart = employeeId.substring(3); // Extracts from the 4th character onward
    const prefix = employeeId.substring(0, 3); // Extracts the first 3 characters
    console.log("Prefix:", prefix); // Output: kst
    console.log("Numeric Part:", numericPart); // Output: 713
    res.send({ status: "Success", data: results });
    if (results.affectedRows === 0) {
      return res.status(400).send({ error: "Designation not found" });
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server error");
  }
};

exports.deactiveEmployees = async (req, res, next) => {
  try {
    const sql = `
        SELECT * FROM attendance_register.tbl_userdetails  where isActive= '0'
        `;

    const [result] = await attendanceConnection.execute(sql);

    if (result.length === 0) {
      res.status(404).send({ status: "Error", message: "Report not found" });
    } else {
      res.send({ status: "Success", data: result });
    }
  } catch (error) {
    next(error);
  }
};

exports.resetPwd = async (req, res, next) => {
  const { employeeId, newPassword, confirmPassword } = req.body;

  try {
    if (!newPassword || !confirmPassword) {
      return res.send({
        status: "Error",
        message: "Missing new password or confirm password",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.send({ status: "Error", message: "Passwords do not match" });
    }

    // Password validation (min 8 characters, uppercase, lowercase, number, special character)
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.send({
        status: "Error",
        message:
          "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.",
      });
    }

    // Hash the new password
    const hashedPassword = crypto
      .createHash("md5")
      .update(newPassword)
      .digest("hex");

    // Update password in database
    const sqlUpdatePassword = `UPDATE tbl_userDetails SET password=? WHERE employeeId=?`;
    await attendanceConnection.execute(sqlUpdatePassword, [
      hashedPassword,
      employeeId,
    ]);

    res.send({
      status: "Success",
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
exports.getHolidays = async (req, res) => {
  try {
    const sql = "CALL sp_getHoliday()";
    const [results] = await attendanceConnection.execute(sql);
    const holidays = results[0];
    console.log("results", holidays);

    const data = {
      status: "success",
      message: "Holiday Retrieved",
      data: holidays,
    };
    res.send(data);
  } catch (error) {
    console.error("Error in getHolidays:", error);
    res.status(500).send({
      status: "Error",
      message: "Failed to retrieve holidays",
      data: error.message || error,
    });
  }
};

exports.project_master = async (req, res, next) => {
  const {
    id,
    project,
    idRef,
    subProject,
    contact_details,
    clientname,
    projectdomain,
    platform,
  } = req.body;

  // Convert JSON fields to strings
  const subProjectString = JSON.stringify(subProject);
  const contactDetailsString = JSON.stringify(contact_details);
  const platformString = JSON.stringify(platform); // Convert platform array/object to string

  try {
    if (id) {
      // Update existing row
      const sql = `
        UPDATE tbl_projects
        SET 
          project = ?, 
          idRef = ?, 
          subProject = ?, 
          contact_details = ?,
          clientname = ?,
          projectdomain = ?,
          platform = ?
        WHERE id = ?`;

      const [result] = await connection.execute(sql, [
        project,
        idRef,
        subProjectString,
        contactDetailsString,
        clientname,
        projectdomain,
        platformString, // use stringified platform
        id,
      ]);

      res.send({
        status: "Success",
        message: "ProjectDetails Updated Successfully",
      });
    } else {
      // Insert new row
      const sql = `
        INSERT INTO tbl_projects 
          (project, idRef, subProject, contact_details, clientname, projectdomain, platform)
        VALUES (?, ?, ?, ?, ?, ?, ?)`;

      const [result] = await connection.execute(sql, [
        project,
        idRef,
        subProjectString,
        contactDetailsString,
        clientname,
        projectdomain,
        platformString, // use stringified platform
      ]);

      res.send({
        status: "Success",
        message: "ProjectDetails Inserted Successfully",
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.get_Project_Master = async (req, res, next) => {
  try {
    const sql = `SELECT * FROM tbl_projects`;
    const [rows] = await connection.execute(sql);

    res.send({
      status: "Success",
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};
exports.getAllHolidays = async (req, res) => {
  try {
    const sql = "Select * from tbl_events";
    const [results] = await attendanceConnection.execute(sql);
    const holidays = results;
    console.log("results", holidays);

    const data = {
      status: "success",
      message: "Holiday Retrieved",
      data: holidays,
    };
    res.send(data);
  } catch (error) {
    console.error("Error in getHolidays:", error);
    res.status(500).send({
      status: "Error",
      message: "Failed to retrieve holidays",
      data: error.message || error,
    });
  }
};

exports.project_assign = async (req, res) => {
  const {
    id,
    employee_id,
    employee_name,
    project_name,
    sub_products,
    assigned_date,
    deadline_date,
    task_details,
    task_description,
    estimated_time,
    task_status,
    remarks,
    created_by,
    admin_review,
    team_leader_review,
    reason_for_incomplete,
  } = req.body;

  const currentDate = new Date().toISOString().slice(0, 10); // Current date (YYYY-MM-DD)

  try {
    if (id) {
      // If ID exists, update project details
      const updateQuery = `
        UPDATE project_assign SET 
          employee_id = ?,
          date = ?, 
          employee_name = ?, 
          project_name = ?, 
          sub_products = ?, 
          assigned_date = ?, 
          deadline_date = ?, 
          task_details = ?, 
          task_description = ?,
          estimated_time = ?,
          task_status = ?,
          remarks = ?,
          created_by = ?,
          admin_review = ?,
          team_leader_review = ?,
          reason_for_incomplete = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await attendanceConnection.execute(updateQuery, [
        employee_id,
        currentDate,
        employee_name,
        project_name,
        sub_products,
        assigned_date,
        deadline_date,
        task_details,
        task_description,
        estimated_time,
        task_status,
        remarks,
        created_by,
        admin_review,
        team_leader_review,
        reason_for_incomplete,
        id,
      ]);

      res.json({ message: "Project updated successfully." });
    } else {
      // If ID doesn't exist, insert a new record
      const insertQuery = `
         INSERT INTO project_assign (
          date, employee_id, employee_name, project_name, sub_products,
          assigned_date, deadline_date, task_details, task_description,
          estimated_time, task_status, remarks, created_by,
          admin_review, team_leader_review, reason_for_incomplete,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      await attendanceConnection.execute(insertQuery, [
        currentDate,
        employee_id,
        employee_name,
        project_name,
        sub_products,
        assigned_date,
        deadline_date,
        task_details,
        task_description,
        estimated_time,
        task_status,
        remarks,
        created_by,
        admin_review,
        team_leader_review,
        reason_for_incomplete,
      ]);

      res.json({ message: "Project assigned successfully." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.get_assigned_project = async (req, res, next) => {
  try {
    const { id, employee_id, from_date, to_date } = req.body;

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0]; // "2025-04-25"

    console.log(formattedDate);

    const startDate = from_date || formattedDate;
    const endDate = to_date || formattedDate;

    let query;
    let params;
    if (id) {
      query = `
        SELECT * FROM project_assign 
        WHERE id = ?`;
      params = [id];
    } else if (employee_id) {
      query = `
        SELECT * FROM project_assign 
        WHERE employee_id = ? 
        AND DATE(\`date\`) BETWEEN ? AND ?
      `;
      params = [employee_id, startDate, endDate];
    } else {
      query = `
        SELECT * FROM project_assign 
        WHERE DATE(\`date\`) BETWEEN ? AND ?
      `;
      params = [startDate, endDate];
    }
    console.log(query, startDate, endDate);
    const [results] = await attendanceConnection.execute(query, params);
    console.log(results);
    if (results.length === 0) {
      return res.json({
        message: "No project data found in the selected date range.",
      });
    }

    res.json({ status: "Success", data: results });
  } catch (error) {
    next(error);
  }
};
exports.delete_project_assign = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  try {
    const deleteQuery = `DELETE FROM project_assign WHERE id = ?`;
    const [result] = await attendanceConnection.execute(deleteQuery, [id]);

    if (result.affectedRows === 0) {
      return res.send({ message: "No project found with the provided id." });
    }

    res.json({ status: "Success", message: "Project deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEmployeesWithMissingTasks = async (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT p.employeeId
      FROM tbl_dailypunch p
      WHERE DATE(p.logTime) = CURDATE()
        AND NOT EXISTS (
          SELECT 1 FROM project_assign a
          WHERE a.employee_id = p.employeeId
            AND DATE(a.assigned_date) = CURDATE()
        )
        AND p.employeeId NOT IN (
          SELECT Employee_id
          FROM leaverequest_form
          WHERE CURDATE() BETWEEN DATE(startDate) AND DATE(endDate)
        )
    `;

    const [results] = await attendanceConnection.execute(sql);
    console.log("Missing task employees:", results);

    const data = {
      status: "success",
      message: "Employees who missed task submission retrieved",
      data: results,
    };
    res.send(data);
  } catch (error) {
    console.error("Error in getEmployeesWithMissingTasks:", error);
    res.status(500).send({
      status: "Error",
      message: "Failed to retrieve employees",
      data: error.message || error,
    });
  }
};
exports.deleteLeaveApplication = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      res.send({
        status: "error",
        message: "Leave application ID is required",
      });
    }

    const deleteQuery = `DELETE FROM leaverequest_form WHERE lid = ?`;
    const [result] = await attendanceConnection.execute(deleteQuery, [id]);

    if (result.affectedRows === 0) {
      return res.send({
        message: "No Leave request found with the provided id.",
      });
    }

    res.send({
      status: "Success",
      message: "Leave request deleted successfully.",
    });
  } catch (error) {
    res.send({ status: "error", message: error });
  }
};

exports.post_rules_form = async (req, res) => {
  try {
    const data = req.body;
    const sql = `
    INSERT INTO rules_form (
      morning_punch, working_hours, permission_hours, permission_count,
      grace_time, late_penalty, break_hours, half_day_limit,
      evening_punch, task_submission, casual_leave, saturday_off, sandwich_policy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const values = [
      data.morning_punch,
      data.working_hours,
      data.permission_hours,
      data.permission_count,
      data.grace_time,
      data.late_penalty,
      data.break_hours,
      data.half_day_limit,
      data.evening_punch,
      data.task_submission,
      data.casual_leave,
      data.saturday_off,
      data.sandwich_policy,
    ];
    const [result] = await attendanceConnection.execute(sql, values);

    if (result.affectedRows === 0) {
      return res.send({ message: "No project found with the provided id." });
    }

    res.json({ status: "Success" });
  } catch (error) {
    res.send({ status: "Error", message: error });
  }
};
exports.get_rules_form = async (req, res) => {
  try {
    const sql = "SELECT * FROM rules_form ORDER BY id DESC LIMIT 1";
    const [result] = await attendanceConnection.execute(sql);

    if (result.length > 0) {
      res.json(result[0]);
    } else {
      res.json({});
    }
  } catch (error) {
    res.send({ status: "Error", message: error });
  }
};

exports.get_late_punch1 = async (req, res) => {
  const sql = `
    SELECT 
      u.employeeId,
      u.name,
      DATE(dp.logTime) AS punchDate,
      TIME(dp.logTime) AS punchTime,
      '09:30:00' AS referenceTime,
      SEC_TO_TIME(
        GREATEST(
          TIME_TO_SEC(TIMEDIFF(TIME(dp.logTime), '09:30:00')) - 
          CASE 
            WHEN lrf.leaveTypes = 'Permission' AND lrf.status IN ('Accepted', 'Pending') THEN
              CASE 
                WHEN lrf.leaveTimes LIKE '1 hour%' THEN 3600
                WHEN lrf.leaveTimes LIKE '2 hour%' THEN 7200
                WHEN lrf.leaveTimes LIKE '3 hour%' THEN 10800
                ELSE 0
              END
            ELSE 0
          END,
          0
        )
      ) AS lateBy
    FROM tbl_userdetails u
    JOIN (
        SELECT employeeId, MIN(logTime) AS logTime
        FROM tbl_dailypunch
        WHERE logType = 'IN'
        GROUP BY employeeId, DATE(logTime)
    ) dp ON dp.employeeId = u.employeeId
    LEFT JOIN leaverequest_form lrf 
      ON lrf.Employee_id = u.employeeId
      AND DATE(dp.logTime) BETWEEN DATE(lrf.startDate) AND DATE(lrf.endDate)
      AND lrf.status = 'Accepted'
    WHERE 
      u.userType = 'Employee'
      AND u.designation IS NOT NULL
      AND TIME(dp.logTime) > '09:30:00'
    HAVING lateBy > '00:00:00'
    ORDER BY dp.logTime DESC;
  `;

  try {
    const [rows] = await attendanceConnection.execute(sql);
    res.json({ status: true, data: rows });
  } catch (error) {
    res.send({ status: "Error", message: error.message });
  }
};
exports.get_late_punch = async (req, res) => {
  try {
    const { fromDate, toDate, employeeId } = req.body;
    const params = employeeId
      ? [fromDate, toDate, employeeId]
      : [fromDate, toDate];

    const filterByEmployee = employeeId ? `AND u.employeeId = ?` : "";

    const sql = `
  SELECT 
    u.employeeId,
    u.name,
    DATE(dp.logTime) AS punchDate,
    TIME(dp.logTime) AS punchTime,
    
    (
      SELECT r.officeStartTime
      FROM rules_master r
      WHERE r.validFrom <= DATE(dp.logTime)
      ORDER BY r.validFrom DESC
      LIMIT 1
    ) AS referenceTime,

    SEC_TO_TIME(
      GREATEST(
        TIME_TO_SEC(
          TIMEDIFF(
            TIME(dp.logTime),
            (
              SELECT r.officeStartTime
              FROM rules_master r
              WHERE r.validFrom <= DATE(dp.logTime)
              ORDER BY r.validFrom DESC
              LIMIT 1
            )
          )
        ) - 
        CASE 
          WHEN lrf.leaveTypes = 'Permission' AND lrf.status IN ('Accepted', 'Pending') THEN
            CASE 
              WHEN lrf.leaveTimes LIKE '1 hour%' THEN 3600
              WHEN lrf.leaveTimes LIKE '2 hour%' THEN 7200
              WHEN lrf.leaveTimes LIKE '3 hour%' THEN 10800
              ELSE 0
            END
          ELSE 0
        END,
        0
      )
    ) AS lateBy

  FROM tbl_userdetails u

  JOIN (
    SELECT employeeId, MIN(logTime) AS logTime
    FROM tbl_dailypunch
    WHERE logType = 'IN'
      AND DATE(logTime) BETWEEN ? AND ?
    GROUP BY employeeId, DATE(logTime)
  ) dp ON dp.employeeId = u.employeeId

  LEFT JOIN leaverequest_form lrf 
    ON lrf.Employee_id = u.employeeId
    AND DATE(dp.logTime) BETWEEN DATE(lrf.startDate) AND DATE(lrf.endDate)
    AND lrf.status IN ('Accepted', 'Pending')

  WHERE 
    u.userType = 'Employee'
    AND u.designation IS NOT NULL
    ${filterByEmployee}
    AND TIME(dp.logTime) > (
      SELECT r.officeStartTime
      FROM rules_master r
      WHERE r.validFrom <= DATE(dp.logTime)
      ORDER BY r.validFrom DESC
      LIMIT 1
    )

  HAVING lateBy > '00:00:00'
  ORDER BY dp.logTime DESC;
`;

    const [rows] = await attendanceConnection.execute(sql, params);
    res.json({ status: true, data: rows });
  } catch (error) {
    res.send({ status: false, message: error.message });
  }
};

exports.post_save_rules = async (req, res) => {
  try {
    const data = req.body;

    // Generate current timestamp for createdAt/updatedAt
    const now = new Date();
    const formattedNow = now.toISOString().slice(0, 19).replace("T", " "); // 'YYYY-MM-DD HH:MM:SS'

    // Generate current date for validFrom (without time)
    const validFrom = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const sql = `
      INSERT INTO rules_master (
        officeStartTime, officeEndTime, workingHoursPerDay, graceTimeLate,
        considerFirstLastPunch, calculateHalfDayMins,
        calculateAbsentMins, calculateAbsentOption, deductBreakFromWork,
        absentWhenLateForDays, absentLateOption,
        weeklyOffPrefixAbsent, weeklyOffSuffixAbsent, weeklyOffBothAbsent,
        totalPermissionHoursPerMonth, noOfPermissionsPerMonth,
        breakHoursPerDay, casualOrPaidLeavePerMonth,
        saturdayOffPerMonth, dailyTaskSubmitMins,
        createdAt, updatedAt, validFrom
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.officeStartTime,
      data.officeEndTime,
      data.workingHoursPerDay,
      data.graceTimeLate,
      data.considerFirstLastPunch,
      data.calculateHalfDayMins,
      data.calculateAbsentMins,
      data.calculateAbsentOption,
      data.deductBreakFromWork,
      data.absentWhenLateForDays,
      data.absentLateOption,
      data.weeklyOffPrefixAbsent,
      data.weeklyOffSuffixAbsent,
      data.weeklyOffBothAbsent,
      data.totalPermissionHoursPerMonth,
      data.noOfPermissionsPerMonth,
      data.breakHoursPerDay,
      data.casualOrPaidLeavePerMonth,
      data.saturdayOffPerMonth,
      data.dailyTaskSubmitMins,
      formattedNow, // createdAt
      formattedNow, // updatedAt
      validFrom, // validFrom (YYYY-MM-DD)
    ];

    const [result] = await attendanceConnection.execute(sql, values);

    if (result.affectedRows === 0) {
      return res.send({ status: "Failed", message: "No rules were saved." });
    }

    res.send({ status: "Success", message: "Rules saved successfully." });
  } catch (error) {
    res.send({ status: "Error", message: error });
  }
};

exports.get_save_rules = async (req, res) => {
  try {
    const today = moment().format("YYYY-MM-DD");
    const sql = "SELECT * FROM rules_master";
    const [result] = await attendanceConnection.execute(sql);

    // Step 1: Filter valid records based on validFrom <= today
    const validRecords = result.filter((item) => {
      if (!item.validFrom) return false;
      const validFrom = moment(item.validFrom).format("YYYY-MM-DD");
      return validFrom <= today;
    });

    // Step 2: Get the record with the latest validFrom
    const latestValidRecord = validRecords.reduce((latest, current) => {
      const latestDate = moment(latest.validFrom).format("YYYY-MM-DD");
      const currentDate = moment(current.validFrom).format("YYYY-MM-DD");
      return currentDate > latestDate ? current : latest;
    }, validRecords[0]);

    console.log("Latest valid record:", latestValidRecord);

    if (result.length > 0) {
      res.json(latestValidRecord);
    } else {
      res.json({});
    }
  } catch (error) {
    res.send({ status: "Error", message: error });
  }
};
exports.get_all_save_rules = async (req, res) => {
  try {
    const sql = "SELECT * FROM rules_master";
    const [result] = await attendanceConnection.execute(sql);

    if (result.length > 0) {
      res.json(result);
    } else {
      res.json({});
    }
  } catch (error) {
    res.send({ status: "Error", message: error });
  }
};
exports.update_rule = async (req, res) => {
  const ruleId = req.params.id;
  const data = req.body;

  // List of columns you want to update, matching your table columns exactly
  const allowedFields = [
    "officeStartTime",
    "officeEndTime",
    "workingHoursPerDay",
    "graceTimeLate",
    "considerFirstLastPunch",
    "calculateHalfDayMins",
    "calculateHalfDayOption",
    "calculateAbsentMins",
    "calculateAbsentOption",
    "deductBreakFromWork",
    "absentWhenLateForDays",
    "absentLateOption",
    "weeklyOffPrefixAbsent",
    "weeklyOffSuffixAbsent",
    "weeklyOffBothAbsent",
    "totalPermissionHoursPerMonth",
    "noOfPermissionsPerMonth",
    "breakHoursPerDay",
    "casualOrPaidLeavePerMonth",
    "saturdayOffPerMonth",
    "dailyTaskSubmitMins",
  ];

  // Build the SET part of the query dynamically for only allowed fields present in data
  const fieldsToUpdate = [];
  const values = [];

  for (const field of allowedFields) {
    if (data.hasOwnProperty(field)) {
      fieldsToUpdate.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (fieldsToUpdate.length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  values.push(ruleId); // For WHERE clause

  const sql = `
    UPDATE rules_master
    SET ${fieldsToUpdate.join(", ")}
    WHERE id = ?
  `;

  try {
    const [result] = await attendanceConnection.execute(sql, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Rule not found" });
    }

    // Optionally fetch updated row to return
    const [rows] = await attendanceConnection.execute(
      "SELECT * FROM rules_master WHERE id = ?",
      [ruleId]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating rule:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.delete_rule = async (req, res) => {
  const ruleId = req.params.id;

  try {
    const [result] = await attendanceConnection.execute(
      "DELETE FROM rules_master WHERE id = ?",
      [ruleId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Rule not found" });
    }

    res.status(200).json({ message: "Rule deleted successfully" });
  } catch (error) {
    console.error("Error deleting rule:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.post_manual_punch_update = async (req, res) => {
  const { id, employeeId, logType, newLogTime } = req.body;

  if (!id || !employeeId || !logType || !newLogTime) {
    return res.send({ status: "Error", message: "Missing required fields" });
  }

  try {
    // 1. Mark old entry inactive
    const deactivateQuery = `
      UPDATE tbl_dailypunch 
      SET isActive = 0, updatedAt = NOW() 
      WHERE id = ?;
    `;
    await attendanceConnection.execute(deactivateQuery, [id]);

    // 2. Insert new corrected entry
    const insertQuery = `
      INSERT INTO tbl_dailypunch (
        employeeId, logSno, logTime, logType, place1, device, createdAt, updatedAt, refTime, isActive
      )
      SELECT 
        employeeId, logSno, ?, logType, place1, ?, NOW(), NOW(), TIME(?), 1
      FROM tbl_dailypunch
      WHERE id = ?;
    `;
    await attendanceConnection.execute(insertQuery, [
      newLogTime,
      "Manual",
      newLogTime,
      id,
    ]);

    return res.send({
      status: "Success",
      message: "Punch updated successfully",
    });
  } catch (err) {
    console.error("Error in manual punch update:", err);
    return res.send({
      status: "Error",
      message: "Server error",
      details: err.message,
    });
  }
};

exports.get_fcmToken = async (req, res) => {
  try {
    const { employeeId, userType, numberOfDays, updateStatus } = req.body;

    if (!employeeId || !userType || !numberOfDays) {
      return res.send({
        status: "Error",
        message: "Missing required parameters",
      });
    }

    const sql = `CALL sp_getfcmToken('${employeeId}', '${userType}')`;
    const [results] = await attendanceConnection.execute(sql);
    const leaveData = results[0];
    const sql1 = `SELECT * FROM tbl_userdetails WHERE employeeId = ?`;
    const [results1] = await attendanceConnection.execute(sql1, [employeeId]);

    if (results1.length === 0) {
      throw new Error("Employee not found.");
    }

    const employeeName = results1[0].name;

    const tokens = leaveData.map((emp) => emp.fcmToken).filter(Boolean);

    if (tokens.length === 0) {
      return res.send({
        status: "Error",
        message: "No FCM tokens found.",
      });
    }

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(
          require("../uploads/firebase/attendance-dec45-firebase-adminsdk-fbsvc-8707780a08.json")
        ),
      });
    }

    const result = [];

    for (const token of tokens) {
      const message = {
        token: token,
        notification: {
          title: "Leave Notification",
          body:
            userType === "admin"
              ? `${employeeName} applied for leave of ${numberOfDays} ${
                  numberOfDays == 1 ? "day" : "days"
                }.`
              : `Your Leave has been ${updateStatus} `,
        },
        data: {
          userType: userType,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      };

      try {
        const response = await admin.messaging().send(message);
        result.push({ token, status: "Sent", response });
      } catch (error) {
        result.push({ token, status: "Failed", error: error.message });
      }
    }

    return res.send({
      status: "Success",
      message: "Firebase notifications sent",
      data: result,
      employeeName: employeeName,
      employeeId: employeeId,
    });
  } catch (error) {
    console.error("Error in get_fcmToken:", error);
    return res.send({
      status: "Error",
      message: error?.toString() || "Unexpected error",
    });
  }
};



///Development in progress by KS Anandh
exports.attenadanceSummary = async (req, res) => {
  const { date } = req.body;
  let ApprovedLeaves = {
    halfDayLeaves: [],
    HourlyLeaves: [],
  };
  let attendees = [];
  let absentees = [];


  try {
    if (!date) {
      res.status(400).send("Date is required");
    }

  //1.get all pounch reports
    query = `SELECT * FROM tbl_dailypunch WHERE CAST(logTime AS DATE) = ?`;
    params = [date];
    const [presenties] = await attendanceConnection.execute(query, params);

      //2.get and filter leave-forms baseed on aprovel
    const query = `
      SELECT *
      FROM leaverequest_form
      WHERE CAST(createdAt AS DATE) = ?
       AND status = 'Accepted' `;
    const params = [date];
    const [leavedApprovels] = await attendanceConnection.execute(query, params);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server error");
  }



  //3.get employee excluding leave-forms and pounch reports
};
