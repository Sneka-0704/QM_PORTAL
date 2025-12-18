sap.ui.define([
    "sap/ui/core/UIComponent",
    "qmportal898/model/models",
    "sap/ui/model/json/JSONModel"
], (UIComponent, models, JSONModel) => {
    "use strict";

    return UIComponent.extend("qmportal898.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // create session model for storing user data
            var oSessionModel = new JSONModel({
                username: "",
                isLoggedIn: false
            });
            this.setModel(oSessionModel, "session");

            // enable routing
            this.getRouter().initialize();
        }
    });
});