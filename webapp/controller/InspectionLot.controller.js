sap.ui.define([
    "qmportal898/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("qmportal898.controller.InspectionLot", {

        onInit: function () {
            // Check user session
            this.getRouter().getRoute("InspectionLot").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // Verify user session
            this.checkUserSession();

            // Refresh table data
            var oTable = this.byId("inspectionLotTable");
            if (oTable) {
                var oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.refresh();
                }
            }
        },

        onNavBack: function () {
            this.getRouter().navTo("Dashboard");
        },

        onRefresh: function () {
            var oTable = this.byId("inspectionLotTable");
            var oBinding = oTable.getBinding("items");

            if (oBinding) {
                oBinding.refresh();
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var aFilters = [];

            if (sQuery && sQuery.length > 0) {
                // Search across multiple fields
                var oFilter = new Filter({
                    filters: [
                        new Filter("InspectionLot", FilterOperator.Contains, sQuery),
                        new Filter("MaterialNumber", FilterOperator.Contains, sQuery),
                        new Filter("Plant", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                });
                aFilters.push(oFilter);
            }

            // Apply filter to table
            var oTable = this.byId("inspectionLotTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);
        },

        onItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var sLotNumber = oContext.getProperty("InspectionLot");

            this.getRouter().navTo("ResultRecording", {
                inspectionLot: sLotNumber
            });
        },

        /**
         * Formatter for Usage Decision status
         * @param {string} sUsageDecision - Usage decision value
         * @returns {string} - Status state (Success, Error, None)
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
