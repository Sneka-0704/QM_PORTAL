sap.ui.define([
    "qmportal898/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, MessageBox, MessageToast, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("qmportal898.controller.ResultRecording", {

        onInit: function () {
            // Create local model for recording data
            var oRecordingModel = new JSONModel({
                lotSelected: false,
                isViewOnly: false,
                currentLot: {},
                newResults: {
                    UnrestrictedStock: 0,
                    BlockedStock: 0,
                    ReworkStock: 0
                },
                previousResults: []
            });
            this.setModel(oRecordingModel, "recordingModel");

            // Check user session on route match
            this.getRouter().getRoute("ResultRecording").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this.checkUserSession();
        },

        onNavBack: function () {
            this.getRouter().navTo("Dashboard");
        },

        onLotSelectionChange: function (oEvent) {
            // Store selected lot key for later use
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                this._sSelectedLotKey = oSelectedItem.getKey();
            }
        },

        onLoadLot: function () {
            var oComboBox = this.byId("lotComboBox");
            var sSelectedKey = oComboBox.getSelectedKey();

            if (!sSelectedKey) {
                MessageBox.warning("Please select an inspection lot first.");
                return;
            }

            // Get the selected lot context
            var oModel = this.getModel();
            var sPath = "/ZQM_RECORD898('" + sSelectedKey + "')";

            // Show busy indicator
            this.getView().setBusy(true);

            // Read the selected lot details
            oModel.read(sPath, {
                success: function (oData) {
                    this.getView().setBusy(false);

                    var oRecordingModel = this.getModel("recordingModel");
                    oRecordingModel.setProperty("/currentLot", oData);
                    oRecordingModel.setProperty("/lotSelected", true);

                    // Check if usage decision has been taken
                    var sUsageDecision = oData.Usagedecision || "";
                    var bDecisionTaken = sUsageDecision !== "" && sUsageDecision.toLowerCase() !== "pending";
                    oRecordingModel.setProperty("/isViewOnly", bDecisionTaken);

                    // Load previous results for this lot
                    this._loadPreviousResults(sSelectedKey);

                    // Clear new results form
                    this._clearNewResultsForm();

                }.bind(this),
                error: function (oError) {
                    this.getView().setBusy(false);
                    MessageBox.error("Failed to load inspection lot details.");
                }.bind(this)
            });
        },

        _loadPreviousResults: function (sLotNumber) {
            // Filter results by inspection lot
            var oModel = this.getModel();
            var aFilters = [
                new Filter("Inspectionlot", FilterOperator.EQ, sLotNumber)
            ];

            oModel.read("/ZQM_RECORD898", {
                filters: aFilters,
                success: function (oData) {
                    var oRecordingModel = this.getModel("recordingModel");

                    // Set previous results (assuming multiple records for incremental recording)
                    var aResults = oData.results || [];
                    oRecordingModel.setProperty("/previousResults", aResults);

                }.bind(this),
                error: function (oError) {
                    MessageBox.error("Failed to load previous results.");
                }.bind(this)
            });
        },

        onSaveResults: function () {
            var oRecordingModel = this.getModel("recordingModel");
            var oNewResults = oRecordingModel.getProperty("/newResults");
            var oCurrentLot = oRecordingModel.getProperty("/currentLot");

            // Validation
            if (!oNewResults.UnrestrictedStock && !oNewResults.BlockedStock && !oNewResults.ReworkStock) {
                MessageBox.warning("Please enter at least one stock quantity.");
                return;
            }

            // Prepare payload
            var oPayload = {
                Inspectionlot: oCurrentLot.Inspectionlot,
                Material: oCurrentLot.Material,
                Plant: oCurrentLot.Plant,
                UnrestrictedStock: parseFloat(oNewResults.UnrestrictedStock) || 0,
                BlockedStock: parseFloat(oNewResults.BlockedStock) || 0,
                ReworkStock: parseFloat(oNewResults.ReworkStock) || 0,
                RecordingDate: new Date().toISOString(),
                Lotquantity: oCurrentLot.Lotquantity,
                Unitofmeasure: oCurrentLot.Unitofmeasure,
                Usagedecision: oCurrentLot.Usagedecision || ""
            };

            // Show busy indicator
            this.getView().setBusy(true);

            // Create new entry in OData service
            var oModel = this.getModel();
            oModel.create("/ZQM_RECORD898", oPayload, {
                success: function (oData) {
                    this.getView().setBusy(false);
                    MessageToast.show("Results saved successfully!");

                    // Refresh previous results
                    this._loadPreviousResults(oCurrentLot.Inspectionlot);

                    // Clear form
                    this._clearNewResultsForm();

                }.bind(this),
                error: function (oError) {
                    this.getView().setBusy(false);

                    var sErrorMsg = "Failed to save results. Please try again.";
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
        },

        onClearForm: function () {
            this._clearNewResultsForm();
        },

        _clearNewResultsForm: function () {
            var oRecordingModel = this.getModel("recordingModel");
            oRecordingModel.setProperty("/newResults", {
                UnrestrictedStock: 0,
                BlockedStock: 0,
                ReworkStock: 0
            });
        },

        /**
         * Formatter for Usage Decision status
         */
        formatUsageDecisionState: function (sUsageDecision) {
            if (!sUsageDecision) {
                return "None";
            }

            var sUpperDecision = sUsageDecision.toUpperCase();

            if (sUpperDecision.includes("APPROVED") || sUpperDecision.includes("ACCEPT")) {
                return "Success";
            } else if (sUpperDecision.includes("REJECTED") || sUpperDecision.includes("REJECT")) {
                return "Error";
            } else {
                return "Warning";
            }
        }
    });
});
