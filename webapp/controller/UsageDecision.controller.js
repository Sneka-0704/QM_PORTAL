sap.ui.define([
    "qmportal898/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, MessageBox, MessageToast, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("qmportal898.controller.UsageDecision", {

        onInit: function () {
            // Create local model for usage decision data
            var oUsageModel = new JSONModel({
                lotSelected: false,
                validationPassed: false,
                validationMessage: "",
                validationState: "None",
                currentLot: {},
                totalQuantities: {
                    unrestricted: 0,
                    blocked: 0,
                    rework: 0,
                    total: 0
                },
                uniqueLots: []
            });
            this.setModel(oUsageModel, "usageModel");

            // Check user session on route match
            this.getRouter().getRoute("UsageDecision").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            this.checkUserSession();
            this._loadUniqueLots();

            var oArgs = oEvent.getParameter("arguments");
            if (oArgs && oArgs.inspectionLot) {
                this.byId("lotComboBox").setSelectedKey(oArgs.inspectionLot);
                this.onLoadLot();
            }
        },

        _loadUniqueLots: function () {
            var oModel = this.getModel();
            var oUsageModel = this.getModel("usageModel");

            this.getView().setBusy(true);

            oModel.read("/ZQM_USAGE898", {
                success: function (oData) {
                    this.getView().setBusy(false);
                    var aResults = oData.results || [];

                    // Filter for uniqueness and non-empty values
                    var aUniqueLots = [];
                    var oProcessedLots = {};

                    aResults.forEach(function (oItem) {
                        var sLot = oItem.InspectionLotNo;
                        if (sLot && !oProcessedLots[sLot]) {
                            oProcessedLots[sLot] = true;
                            aUniqueLots.push({
                                InspectionLotNo: oItem.InspectionLotNo,
                                Plant: oItem.Plant || ""
                            });
                        }
                    });

                    oUsageModel.setProperty("/uniqueLots", aUniqueLots);
                }.bind(this),
                error: function (oError) {
                    this.getView().setBusy(false);
                    console.error("Failed to load unique lots", oError);
                }.bind(this)
            });
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

            // Show busy indicator
            this.getView().setBusy(true);

            // Get the selected lot details
            var oModel = this.getModel();
            var sPath = "/ZQM_USAGE898('" + sSelectedKey + "')";

            oModel.read(sPath, {
                success: function (oData) {
                    var oUsageModel = this.getModel("usageModel");
                    oUsageModel.setProperty("/currentLot", oData);
                    oUsageModel.setProperty("/lotSelected", true);

                    // Calculate total quantities from the lot data
                    this._calculateTotalQuantities(oData);

                    // Validate quantities
                    this._validateQuantities();

                    this.getView().setBusy(false);

                }.bind(this),
                error: function (oError) {
                    this.getView().setBusy(false);
                    MessageBox.error("Failed to load inspection lot details.");
                }.bind(this)
            });
        },

        _calculateTotalQuantities: function (oLotData) {
            // Extract quantities from the lot data
            // Assuming the entity has fields for recorded quantities
            var fUnrestricted = parseFloat(oLotData.UnrestrictedStock) || 0;
            var fBlocked = parseFloat(oLotData.BlockedStock) || 0;
            var fRework = parseFloat(oLotData.ReworkStock) || 0;
            var fTotal = fUnrestricted + fBlocked + fRework;

            var oUsageModel = this.getModel("usageModel");
            oUsageModel.setProperty("/totalQuantities", {
                unrestricted: fUnrestricted,
                blocked: fBlocked,
                rework: fRework,
                total: fTotal
            });
        },

        _validateQuantities: function () {
            var oUsageModel = this.getModel("usageModel");
            var oCurrentLot = oUsageModel.getProperty("/currentLot");
            var oTotalQuantities = oUsageModel.getProperty("/totalQuantities");

            var fLotQuantity = parseFloat(oCurrentLot.Lotquantity) || 0;
            var fTotalInspected = oTotalQuantities.total;

            // Validate if totals match
            if (fTotalInspected === fLotQuantity) {
                // Validation passed
                oUsageModel.setProperty("/validationPassed", true);
                oUsageModel.setProperty("/validationState", "Success");
                oUsageModel.setProperty("/validationMessage", "");
            } else {
                // Validation failed
                var fDifference = fLotQuantity - fTotalInspected;
                var sMessage = "";

                if (fTotalInspected < fLotQuantity) {
                    sMessage = "✗ Validation Failed: Total inspected quantity (" + fTotalInspected + ") is LESS than lot quantity (" + fLotQuantity + "). Difference: " + fDifference + ". Please record the remaining results.";
                } else {
                    sMessage = "✗ Validation Failed: Total inspected quantity (" + fTotalInspected + ") is GREATER than lot quantity (" + fLotQuantity + "). Difference: " + Math.abs(fDifference) + ". Please check the recorded results.";
                }

                oUsageModel.setProperty("/validationPassed", false);
                oUsageModel.setProperty("/validationState", "Error");
                oUsageModel.setProperty("/validationMessage", sMessage);
            }
        },

        onApprove: function () {
            // Re-validate before approving
            this._validateQuantities();

            var oUsageModel = this.getModel("usageModel");
            var bValidationPassed = oUsageModel.getProperty("/validationPassed");

            if (!bValidationPassed) {
                MessageBox.error("Cannot approve. Quantity validation has failed.");
                return;
            }

            var oCurrentLot = oUsageModel.getProperty("/currentLot");

            MessageBox.confirm(
                "Are you sure you want to APPROVE this inspection lot?",
                {
                    title: "Confirm Approval",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._submitDecision(oCurrentLot, "Approved");
                        }
                    }.bind(this)
                }
            );
        },

        onReject: function () {
            // Re-validate before rejecting
            this._validateQuantities();

            var oUsageModel = this.getModel("usageModel");
            var bValidationPassed = oUsageModel.getProperty("/validationPassed");

            if (!bValidationPassed) {
                MessageBox.error("Cannot reject. Quantity validation has failed.");
                return;
            }

            var oCurrentLot = oUsageModel.getProperty("/currentLot");

            MessageBox.confirm(
                "Are you sure you want to REJECT this inspection lot?",
                {
                    title: "Confirm Rejection",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._submitDecision(oCurrentLot, "Rejected");
                        }
                    }.bind(this)
                }
            );
        },

        _submitDecision: function (oLotData, sDecision) {
            // Show busy indicator
            this.getView().setBusy(true);

            // Prepare payload with updated usage decision
            var oPayload = {
                InspectionLotNo: oLotData.InspectionLotNo,
                Plant: oLotData.Plant || "",
                UsageDecisionCode: sDecision === "Approved" ? "A" : "R",  // A for Approved, R for Rejected
                CodeValuation: sDecision === "Approved" ? "A" : "R",
                SelectedSet: oLotData.SelectedSet || "",
                CodeGroup: oLotData.CodeGroup || "",
                QualityScore: oLotData.QualityScore || 0
                // Note: Stock quantity fields (UnrestrictedStock, BlockedStock, ReworkStock)
                // are not present in ZQM_USAGE898 metadata. These may need to be added
                // to the backend CDS view if required.
            };

            var oModel = this.getModel();
            var sPath = "/ZQM_USAGE898('" + oLotData.InspectionLotNo + "')";

            // Update the usage decision
            oModel.update(sPath, oPayload, {
                success: function () {
                    this.getView().setBusy(false);

                    MessageBox.success(
                        "Usage decision '" + sDecision + "' has been successfully submitted for Inspection Lot " + oLotData.Inspectionlot + ".",
                        {
                            onClose: function () {
                                // Navigate back to Dashboard
                                this.getRouter().navTo("Dashboard");
                            }.bind(this)
                        }
                    );

                }.bind(this),
                error: function (oError) {
                    this.getView().setBusy(false);

                    var sErrorMsg = "Failed to submit decision. Please try again.";
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
