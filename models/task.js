const { DataTypes, Model }  = require('sequelize');
const sequelize =require ('../db/sequelize.js')

const Task = sequelize.define('Task', {
  
    date: {
      type: DataTypes.DATE, // Change to DATE type
      allowNull: true,
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    task: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    estimatedTime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    startTime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taskStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reasonForIncomplete: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    employeeName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    review: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    evaluation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Task",
    tableName: "Task",
  }
);

Task.sync()
  .then(() => {
    console.log("Task table created successfully.");
  })
  .catch((error) => {
    console.error("Error creating User table:", error);
  });

module.exports = Task;
