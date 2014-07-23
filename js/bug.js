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
        if (summary_field.get('value').length < 4) return;
        YUI.bugzilla.dupTable.counter = YUI.bugzilla.dupTable.counter + 1;
        var json_object = {
            version : "1.1",
            method : "Bug.possible_duplicates",
            id : YUI.bugzilla.dupTable.counter,
            params : {
                product : product_name,
                summary : summary_field.get('value'),
                limit : 7,
                include_fields : [ "id", "summary", "status", "resolution",
                                   "update_token" ]
            }
        };
        var post_data = Y.JSON.stringify(json_object);
        dataTable.showMessage("loadingMessage");
        Y.one('#possible_duplicates_container').removeClass('bz_default_hidden');
        dataTable.datasource.load({
            request: post_data,
            cfg: {
              method: "POST",
              headers: { 'Content-Type': 'application/json' }
            }
        });
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
    formatBugLink: function(el) {
        el.value = '<a href="show_bug.cgi?id=' + el.data.id + '">' 
                       + el.data.id + '</a>';
    },
    formatStatus: function(el) {
        var resolution = el.data.resolution;
        var bug_status = display_value('bug_status', el.data.status);
        if (resolution) {
            el.value = bug_status + ' ' 
                           + display_value('resolution', resolution);
        }
        else {
            el.value = bug_status;
        }
    },
    formatCcButton: function(el) {
        var url = 'process_bug.cgi?id=' + el.data.id 
                  + '&addselfcc=1&token=' + (el.data.update_token);
        var button = Y.Node.create('<button type="button" id = formatCcButton_' + el.data.id + '></button>');
        button.set('text', YUI.bugzilla.dupTable.addCcMessage);
        el.cell.appendChild(button);
        new Y.Button({
            srcNode: '#formatCcButton_' + el.data.id,
            on:{
                click: function(){
                   window.open(url, "_self");
                }
            }
        }).render();
    },
    init_ds: function() {
        var new_ds = new Y.DataSource.IO({
            source: "jsonrpc.cgi"
        });
        new_ds.plug(Y.Plugin.DataSourceJSONSchema, {
            schema: {
                resultListLocator: "result.bugs",
                resultFields: [ "id", "summary", "status", "resolution",
                                     "update_token" ],
                metaFields : { error: "error", jsonRpcId: "id" }                     
            }
        }).plug(Y.Plugin.DataSourceCache, { max: 3 });

        this.dataSource = new_ds;
    },
    init: function(data) {
        if (this.dataSource == null) this.init_ds();
        var dt = new Y.DataTable({
            columns: data.columns,
            strings: data.options,
            summary : 'Possible Duplicates'
        });
        dt.plug(Y.Plugin.DataTableDataSource, {
            datasource: this.dataSource
        });
        dt.render('#' + data.container);
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
        var flag_rows = Y.all('tbody .bz_flag_type'); //*Is this selector string correct ?
        for (var i = 0; i < flag_rows.size(); i++) {
            // Each flag table row should have one flag form select element
            // We get the flag type id from the id attribute of the select.
            var flag_select = flag_rows.item(i).all('.flag_select').item(0); // is it correct ? Now the problem of flag_select being null is removed.
            var type_id = flag_select.get('id').split('-')[1];
            var can_set = flag_select.get('options').size() > 1 ? 1 : 0; //* or flag_select.options.size() ? How do we identify which properties are meant to be accessed through the get function and which can be accessed directly ?
            var show = 0;
            // Loop through the allowed flag ids for the selected component
            // and if we match, then show the row, otherwise hide the row.
            for (var j = 0; j < flags[index].length; j++) {//*Where is the flags array defined and what does it contain ?
                if (flags[index][j] == type_id) {
                    show = 1;
                    break;
                }
            }
            if (show && can_set) {
                flag_select.set('disabled', false);
                flag_rows.item(i).removeClass('bz_default_hidden');
            } else {
                flag_select.set('disabled', true);
                flag_rows.item(i).addClass('bz_default_hidden');
            }
        }
    }
}
(function(){
    'use strict';
    YUI.bugzilla.bugUserLastVisit = {
        update: function(bug_id) {
            var post_data = Y.JSON.stringify({
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
            Y.io.header('Content-Type', 'application/json');
            Y.io('jsonrpc.cgi',{
                method: 'POST',
                data: post_data,
                headers: {'Content-Type': 'application/json'},
                on: callbacks
                    
            });
        },

        get: function(done) {
            var post_data = Y.JSON.stringify({
                version: "1.1",
                method: 'BugUserLastVisit.get',
                params: { },
            });
            var callbacks = {
                success: function(res) { done(Y.JSON.parse(res.responseText)) },
                failure: function(res) {
                    if (console)    
                        console.log("failed to get last visited: "
                                + res.responseText);
                },
            };
            Y.io.header('Content-Type', 'application/json');
            Y.io('jsonrpc.cgi',{
                method: 'POST',
                data: post_data,
                headers: {'Content-Type': 'application/json'},
                on: callbacks
            });
        },
    };
})();
    