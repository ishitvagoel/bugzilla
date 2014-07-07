/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This Source Code Form is "Incompatible With Secondary Licenses", as
 * defined by the Mozilla Public License, v. 2.0.
 */

/* This library assumes that the needed YUI libraries have been loaded 
   already. */

YUI.bugzilla.dupTable = {
    counter: 0,
    dataSource: null,
    updateTable: function(dataTable, product_name, summary_field) {
        if (summary_field.get('value').size() < 4) return;

        YUI.bugzilla.dupTable.counter = YUI.bugzilla.dupTable.counter + 1;
        YAHOO.util.Connect.setDefaultPostHeader('application/json', true);
        var json_object = {
            version : "1.1",
            method : "Bug.possible_duplicates",
            id : YAHOO.bugzilla.dupTable.counter,
            params : {
                product : product_name,
                summary : summary_field.value,
                limit : 7,
                include_fields : [ "id", "summary", "status", "resolution",
                                   "update_token" ]
            }
        };
        var post_data = Y.JSON.stringify(json_object);

        var callback = {
            success: dataTable.onDataReturnInitializeTable,
            failure: dataTable.onDataReturnInitializeTable,
            scope:   dataTable,
            argument: dataTable.getState()
        };
        dataTable.showTableMessage(dataTable.get("MSG_LOADING"),
                                   YAHOO.widget.DataTable.CLASS_LOADING);
        YAHOO.util.Dom.removeClass('possible_duplicates_container',
                                   'bz_default_hidden');
        dataTable.getDataSource().sendRequest(post_data, callback);
    },
    // This is the keyup event handler. It calls updateTable with a relatively
    // long delay, to allow additional input. However, the delay is short
    // enough that nobody could get from the summary field to the Submit
    // Bug button before the table is shown (which is important, because
    // the showing of the table causes the Submit Bug button to move, and
    // if the table shows at the exact same time as the button is clicked,
    // the click on the button won't register.)
    doUpdateTable: function(e, args) {
        var dt = args[0];
        var product_name = args[1];
        var summary = e.target;
        clearTimeout(YUI.bugzilla.dupTable.lastTimeout);
        YUI.bugzilla.dupTable.lastTimeout = setTimeout(function() {
            YUI.bugzilla.dupTable.updateTable(dt, product_name, summary) },
            600);
    },
    formatBugLink: function(el, oRecord, oColumn, oData) {
        el.innerHTML = '<a href="show_bug.cgi?id=' + oData + '">' 
                       + oData + '</a>';
    },
    formatStatus: function(el, oRecord, oColumn, oData) {
        var resolution = oRecord.getData('resolution');
        var bug_status = display_value('bug_status', oData);
        if (resolution) {
            el.innerHTML = bug_status + ' ' 
                           + display_value('resolution', resolution);
        }
        else {
            el.innerHTML = bug_status;
        }
    },
    formatCcButton: function(el, oRecord, oColumn, oData) {
        var url = 'process_bug.cgi?id=' + oRecord.getData('id') 
                  + '&addselfcc=1&token=' + escape(oData);
        var button = document.createElement('a');
        button.setAttribute('href',  url);
        button.innerHTML = YAHOO.bugzilla.dupTable.addCcMessage;
        el.appendChild(button);
        new YAHOO.widget.Button(button);
    },
    init_ds: function() { // Do we even require this property ? Can't we just shift this logic inside init only ?
        var new_ds = new Y.DataSource.IO({ source: "jsonrpc.cgi" });
        
        var callback = {
            success: function(e){ //What logic is needed here ?
                Y.log(e.response);
            },
            failure: function(e){//What logic is needed here ?
                Y.log(e.response);
            }
        }

        new_ds.plug(Y.Plugin.DataSourceJSONSchema, {
            schema: {
                resultListLocator: "bug.result",
                resultFields: [ "id", "summary", "status", "resolution",
                                     "update_token" ]
            }
        });
        
        var json_object = {
            version : "1.1",
            method : "Bug.possible_duplicates",
            id : YAHOO.bugzilla.dupTable.counter    ,
            params : {
                product : product_name,
                summary : summary_field.value,
                limit : 7,
                include_fields : [ "id", "summary", "status", "resolution",
                                   "update_token" ]
            }
        };
        var post_data = Y.JSON.stringify(json_object);

        new_ds.sendRequest({
          request:post_data ,
          cfg: {
                  method: "POST",
                  headers: { 'Content-Type': 'application/json' }
              },
          callback: callback
        });

        //Are we missing out on some functionality achieved by setting these properties ? 
        //Checked the docs for YUI3 but didn't get info about these properties.Caching still can be done.
        
        /*new_ds.connTimeout = 30000;
        new_ds.connMethodPost = true;
        new_ds.connXhrMode = "cancelStaleRequests";
        new_ds.maxCacheEntries = 3;
        new_ds.responseSchema = {
            resultsList : "result.bugs",
            metaFields : { error: "error", jsonRpcId: "id" }
        };
        */
        
        //What do we need to do with dobeforeParseData function ? Should it be implemented as a failure function inside the callback ?
        /*
        // DataSource can't understand a JSON-RPC error response, so
        // we have to modify the result data if we get one.
        new_ds.doBeforeParseData = 
            function(oRequest, oFullResponse, oCallback) { // Response consists of http://yui.github.io/yui2/docs/yui_2.9.0_full/datasource/index.html#ds_oParsedResponse
                if (oFullResponse.error) {
                    oFullResponse.result = {};
                    oFullResponse.result.bugs = [];
                    if (console) {
                        console.log("JSON-RPC error:", oFullResponse.error);
                    }
                }
                return oFullResponse;
        }
        */
        this.dataSource = new_ds;
    },
    init: function(data) {
        if (this.dataSource == null) this.init_ds();
        data.options.initialLoad = false; // What is the use of this ?
        var dt = new Y.DataTable({
            columns: data.columns,
            data: this.dataSource,  
            strings: data.options // as per https://github.com/mozilla/webtools-bmo-bugzilla/blob/master/extensions/MyDashboard/web/js/flags.js#L145
        });
        dt.render('#' + data.container);
        
        /*
        var dt = new YAHOO.widget.DataTable(data.container, data.columns, 
            this.dataSource, data.options); 
        */
        Y.one('#' + data.summary_field).on('keyup', this.doUpdateTable, null, [dt, data.product_name]); // as per http://stackoverflow.com/questions/2398877/how-to-pass-arguments-to-yui3s-on-method-callbacks
    }
};

function set_assign_to(use_qa_contact) {
    // Based on the selected component, fill the "Assign To:" field
    // with the default component owner, and the "QA Contact:" field
    // with the default QA Contact. It also selectively enables flags.
    var form = document.Create;
    var assigned_to = form.assigned_to.value;

    if (use_qa_contact) {
        var qa_contact = form.qa_contact.value;
    }

    var index = -1;
    if (form.component.type == 'select-one') {
        index = form.component.selectedIndex;
    } else if (form.component.type == 'hidden') {
        // Assume there is only one component in the list
        index = 0;
    }
    if (index != -1) {
        var owner = initialowners[index];
        var component = components[index];
        if (assigned_to == last_initialowner
            || assigned_to == owner
            || assigned_to == '') {
            form.assigned_to.value = owner;
            last_initialowner = owner;
        }

        document.getElementById('initial_cc').innerHTML = initialccs[index];
        document.getElementById('comp_desc').innerHTML = comp_desc[index];

        if (use_qa_contact) {
            var contact = initialqacontacts[index];
            if (qa_contact == last_initialqacontact
                || qa_contact == contact
                || qa_contact == '') {
                  form.qa_contact.value = contact;
                  last_initialqacontact = contact;
            }
        }

        // We show or hide the available flags depending on the selected component.
        var flag_rows = YAHOO.util.Dom.getElementsByClassName('.bz_flag_type', 'tbody');
        for (var i = 0; i < flag_rows.length; i++) {
            // Each flag table row should have one flag form select element
            // We get the flag type id from the id attribute of the select.
            var flag_select = YAHOO.util.Dom.getElementsByClassName('flag_select', 
                                                                    'select', 
                                                                    flag_rows[i])[0];
            var type_id = flag_select.id.split('-')[1];
            var can_set = flag_select.options.length > 1 ? 1 : 0;
            var show = 0;
            // Loop through the allowed flag ids for the selected component
            // and if we match, then show the row, otherwise hide the row.
            for (var j = 0; j < flags[index].length; j++) {
                if (flags[index][j] == type_id) {
                    show = 1;
                    break;
                }
            }
            if (show && can_set) {
                flag_select.disabled = false;
                YAHOO.util.Dom.removeClass(flag_rows[i], 'bz_default_hidden');
            } else {
                flag_select.disabled = true;
                YAHOO.util.Dom.addClass(flag_rows[i], 'bz_default_hidden');
            }
        }
    }
}

(function(){
    'use strict';
    var JSON = YAHOO.lang.JSON;

    YAHOO.bugzilla.bugUserLastVisit = {
        update: function(bug_id) {
            var args = JSON.stringify({
                version: "1.1",
                method: 'BugUserLastVisit.update',
                params: { ids: bug_id },
            });
            var callbacks = {
                failure: function(res) {
                    if (console)
                        console.log("failed to update last visited: "
                            + res.responseText);
                },
            };

            YAHOO.util.Connect.setDefaultPostHeader('application/json', true);
            YAHOO.util.Connect.asyncRequest('POST', 'jsonrpc.cgi', callbacks,
                args)
        },

        get: function(done) {
            var args = JSON.stringify({
                version: "1.1",
                method: 'BugUserLastVisit.get',
                params: { },
            });
            var callbacks = {
                success: function(res) { done(JSON.parse(res.responseText)) },
                failure: function(res) {
                    if (console)
                        console.log("failed to get last visited: "
                                + res.responseText);
                },
            };

            YAHOO.util.Connect.setDefaultPostHeader('application/json', true);
            YAHOO.util.Connect.asyncRequest('POST', 'jsonrpc.cgi', callbacks,
                    args)
        },
    };
})();
