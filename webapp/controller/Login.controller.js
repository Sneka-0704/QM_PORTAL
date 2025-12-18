sap.ui.define([
    "qmportal898/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, MessageBox, MessageToast, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("qmportal898.controller.Login", {

        onInit: function () {
            // Create local model for login form
            var oLoginModel = new JSONModel({
                username: "",
                password: ""
            });
            this.setModel(oLoginModel, "loginModel");
        },

        onLogin: function () {
            var sUsername = this.getModel("loginModel").getProperty("/username");
            var sPassword = this.getModel("loginModel").getProperty("/password");

            // Validation
            if (!sUsername || !sPassword) {
                MessageBox.error("Please enter both username and password.");
                return;
            }

            // Show busy indicator
            var oPage = this.byId("loginPage");
            oPage.setBusy(true);

            // Get OData model
            var oModel = this.getOwnerComponent().getModel();

            // Create filters for username and password
            var aFilters = [
                new Filter("Userid", FilterOperator.EQ, sUsername),
                new Filter("Password", FilterOperator.EQ, sPassword)
            ];

            // Read from ZQM_LOGIN898 entity set
            oModel.read("/ZQM_LOGIN898", {
                filters: aFilters,
                success: function (oData) {
                    oPage.setBusy(false);

                    // Check if any records returned - if yes, credentials are valid
                    if (oData.results && oData.results.length > 0) {
                        // Valid login
                        MessageToast.show("Login successful!");

                        // Store user data in session model
                        var oSessionModel = this.getOwnerComponent().getModel("session");
                        oSessionModel.setProperty("/username", sUsername);
                        oSessionModel.setProperty("/isLoggedIn", true);

                        // Clear login form
                        this.getModel("loginModel").setProperty("/username", "");
                        this.getModel("loginModel").setProperty("/password", "");

                        // Navigate to Dashboard
                        this.getRouter().navTo("Dashboard");
                    } else {
                        // Invalid credentials - no matching record found
                        MessageBox.error("Invalid username or password. Please try again.");
                    }
                }.bind(this),
                error: function (oError) {
                    oPage.setBusy(false);

                    // Parse error message
                    var sErrorMsg = "Login failed. Please check your connection and try again.";
                    try {
                        var oErrorResponse = JSON.parse(oError.responseText);
                        if (oErrorResponse.error && oErrorResponse.error.message &&
                            oErrorResponse.error.message.value) {
                            sErrorMsg = oErrorResponse.error.message.value;
                        }
                    } catch (e) {
                        // Use default error message
                    }

                    MessageBox.error(sErrorMsg);
                }.bind(this)
            });
        }
    });
});
