sap.ui.define([
    "qmportal898/controller/BaseController",
    "sap/m/MessageToast"
], function (BaseController, MessageToast) {
    "use strict";

    return BaseController.extend("qmportal898.controller.Dashboard", {

        onInit: function () {
            // Check if user is logged in
            this.getRouter().getRoute("Dashboard").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // Verify user session on route match
            this.checkUserSession();
        },

        onInspectionLotPress: function () {
            this.getRouter().navTo("InspectionLot");
        },

        onResultRecordingPress: function () {
            this.getRouter().navTo("ResultRecording");
        },

        onUsageDecisionPress: function () {
            this.getRouter().navTo("UsageDecision");
        },

        onLogout: function () {
            // Clear session data
            var oSessionModel = this.getOwnerComponent().getModel("session");
            oSessionModel.setProperty("/username", "");
            oSessionModel.setProperty("/isLoggedIn", false);

            MessageToast.show("Logged out successfully");

            // Navigate to Login
            this.getRouter().navTo("Login");
        }
    });
});
