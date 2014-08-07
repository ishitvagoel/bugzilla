/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This Source Code Form is "Incompatible With Secondary Licenses", as
 * defined by the Mozilla Public License, v. 2.0.
 */

/* This library assumes that the needed YUI libraries have been loaded 
   already. */

var bz_no_validate_enter_bug = false;
function validateEnterBug(theform) {
    // This is for the "bookmarkable templates" button.
    if (bz_no_validate_enter_bug) {
        // Set it back to false for people who hit the "back" button
        bz_no_validate_enter_bug = false;
        return true;
    }

    var component = theform.component;
    var short_desc = theform.short_desc;
    var version = theform.version;
    var bug_status = theform.bug_status;
    var description = theform.comment;
    var attach_data = theform.data;
    var attach_desc = theform.description;
    
    theform = Y.Node(theform);
    var current_errors = theform.all('.validation_error_text');
    for (var i = 0; i < current_errors.size(); i++) {
        current_errors.item(i).ancestor().removeChild(current_errors.item(i));
    }
    var current_error_fields = theform.all('.validation_error_field');
    for (var i = 0; i < current_error_fields.size(); i++) {
        var field = current_error_fields.item(i);
       field.removeClass('validation_error_field');
    }

    var focus_me;

    // These are checked in the reverse order that they appear on the page,
    // so that the one closest to the top of the form will be focused.
    if (attach_data.value && Y.Lang.trim(attach_desc.value) == '') {
        _errorFor(attach_desc, 'attach_desc');
        focus_me = attach_desc;
    }
    var check_description = status_comment_required[bug_status.value];
    if (check_description && Y.Lang.trim(description.value) == '') {
        _errorFor(description, 'description');
        focus_me = description;
    }
    if (Y.Lang.trim(short_desc.value) == '') {
        _errorFor(short_desc);
        focus_me = short_desc;
    }
    if (version.selectedIndex < 0) {
        _errorFor(version);
        focus_me = version;
    }
    if (component.selectedIndex < 0) {
        _errorFor(component);
        focus_me = component;
    }

    if (focus_me) {
        focus_me.focus();
        return false;
    }

    return true;
}

function _errorFor(field, name) {
    field = Y.Node(field);
    if (!name) name = field.get('id');
    var string_name = name + '_required';
    var error_text = BUGZILLA.string[string_name];
    var new_node = Y.Node.create('<div></div>');
    new_node.addClass('validation_error_text');
    new_node.set('innerHTML', error_text);
    field.insert(new_node, "after");// To Confirm
    field.addClass('validation_error_field');
}

/* This function is never to be called directly, but only indirectly
 * using template/en/default/global/calendar.js.tmpl, so that localization
 * works. For the same reason, if you modify this function's parameter list,
 * you need to modify the documentation in said template as well. */
function createCalendar(name, start_weekday, months_long, weekdays_short) {
    var cal = new Y.Calendar({
        contentBox: '#con_calendar_' + name,
        showPrevMonth: true,
        showNextMonth: true,
        date: new Date(),    
    });
    if(start_weekday)//For testing ; sometimes this parameter is undefined.
    cal.set('strings.first_weekday', start_weekday); // as per http://yuilibrary.com/forum-archive/forum/viewtopic.php@p=30610.html
    if(weekdays_short)
    cal.set('strings.very_short_weekdays', weekdays_short);
    YUI.bugzilla['calendar_' + name] = cal;
    var field = document.getElementById(name);
    cal.on("selectionChange", setFieldFromCalendar, null, field);    
    updateCalendarFromField(field);
    cal.render('#con_calendar' + name);
    cal.hide();
}

/* The onclick handlers for the button that shows the calendar. */
function showCalendar(field_name) {
    var calendar  = YUI.bugzilla["calendar_" + field_name];
    var field     = document.getElementById(field_name);
    var button = Y.one('#button_calendar_' + field_name);
    var calendar_container = calendar.get('contentBox').getDOMNode();
    bz_overlayBelow(calendar_container, field);
    calendar.show();
    button.getDOMNode().onclick = function() { 
        hideCalendar(field_name);
    };

    // Because of the way removeListener works, this has to be a function
    // attached directly to this calendar.
    calendar.bz_myBodyCloser = function(event) {
        var container = this.get('contentBox');
        var target    = event.target;//To confirm if target is a YUI node or not.
        if (target != container && target != button
            && !container.contains(target))
        {
            hideCalendar(field_name);
        }
    };

    // If somebody clicks outside the calendar, hide it.
    Y.one('body').on('click', calendar.bz_myBodyCloser, calendar) ;

    // Make Esc close the calendar.
    calendar.bz_escCal = function(event) {
        var key = event.charCode; // To confirm
        if (key == 27) {
            hideCalendar(field_name);
        }
    };
    Y.one('body').on('keydown', calendar.bz_escCal);
}

function hideCalendar(field_name) {
    var cal = YUI.bugzilla["calendar_" + field_name];
    cal.hide(); 
    var button = document.getElementById('button_calendar_' + field_name);
    button.onclick = function() { 
        showCalendar(field_name);
    };
    var documentBody = Y.one('body');
    documentBody.detach('click',cal.bz_myBodyCloser);
    documentBody.detach('keydown', cal.bz_escCal);
}

/* This is the selectEvent for our Calendar objects on our custom 
 * DateTime fields.
 */
function setFieldFromCalendar(ev,date_field) {
    var dates = ev.newSelection[0];
    /*if(!dates) {
        date_field.value = "";
        hideCalendar(date_field.id);
        return;
    } */   
    // We can't just write the date straight into the field, because there 
    // might already be a time there.
    var timeRe = /\b(\d{1,2}):(\d\d)(?::(\d\d))?/;
    var currentTime = timeRe.exec(date_field.value);
    var d = Y.Date.parse(dates);
    if (currentTime) {
        d.setHours(currentTime[1], currentTime[2]);
        if (currentTime[3]) {
            d.setSeconds(currentTime[3]);
        }
    }

    var year = d.getFullYear();
    // JavaScript's "Date" represents January as 0 and December as 11.
    var month = d.getMonth() + 1;
    if (month < 10) month = '0' + String(month);
    var day = d.getDate();
    if (day < 10) day = '0' + String(day);
    var dateStr = year + '-' + month  + '-' + day;

    if (currentTime) {
        var minutes = d.getMinutes();
        if (minutes < 10) minutes = '0' + String(minutes);
        var seconds = d.getSeconds();
        if (seconds > 0 && seconds < 10) {
            seconds = '0' + String(seconds);
        }

        dateStr = dateStr + ' ' + d.getHours() + ':' + minutes;
        if (seconds) dateStr = dateStr + ':' + seconds;
    }

    date_field.value = dateStr;
    hideCalendar(date_field.id);
}

/* Sets the calendar based on the current field value. 
 */ 
function updateCalendarFromField(date_field) {
    var dateRe = /(\d\d\d\d)-(\d\d?)-(\d\d?)/;
    var pieces = dateRe.exec(date_field.value);
    if (pieces) {
        var cal = YUI.bugzilla["calendar_" + date_field.id];
        cal.selectDates(new Date(pieces[1], pieces[2] - 1, pieces[3]));
        var selectedArray = cal.get('selectedDates');
        var selected = selectedArray[0];
        cal.deselectDates(selected);
        cal.set("date", selected); // date is used to set the current visible date.
        //cal.showCalendar();
    }
}

function setupEditLink(id) {
    var link_container = 'container_showhide_' + id;
    var input_container = 'container_' + id;
    var link = 'showhide_' + id;
    hideEditableField(link_container, input_container, link);
}

/* Hide input/select fields and show the text with (edit) next to it */
function hideEditableField( container, input, action, field_id, original_value, new_value, hide_input ) {
    Y.one('#' + container).removeClass('bz_default_hidden');
    Y.one('#' + input).addClass('bz_default_hidden');
    Y.one('#' + action).on('click', showEditableField, null,
                                 new Array(container, input, field_id, new_value));
    if(field_id != ""){
        Y.on('load', checkForChangedFieldValues, null, //To confirm whether Y.on will be good enough ?
                        new Array(container, input, field_id, original_value, hide_input ));
    }
}

/* showEditableField (e, ContainerInputArray)
 * Function hides the (edit) link and the text and displays the input/select field
 *
 * var e: the event
 * var ContainerInputArray: An array containing the (edit) and text area and the input being displayed
 * var ContainerInputArray[0]: the container that will be hidden usually shows the (edit) or (take) text
 * var ContainerInputArray[1]: the input area and label that will be displayed
 * var ContainerInputArray[2]: the input/select field id for which the new value must be set
 * var ContainerInputArray[3]: the new value to set the input/select field to when (take) is clicked
 */
function showEditableField (e, ContainerInputArray) {
    var inputs = new Array();
    var inputArea = Y.one('#' + ContainerInputArray[1]);    
    if ( ! inputArea ){
        e.preventDefault();
        return;
    }   
    Y.one('#' + ContainerInputArray[0]).addClass('bz_default_hidden');
    inputArea.removeClass('bz_default_hidden');
    if ( inputArea.get('tagName').toLowerCase() == "input" ) {
        inputs.push(inputArea);
    } else if (ContainerInputArray[2]) {
        inputs.push(Y.one('#' + ContainerInputArray[2]));
    } else {
        inputs = inputArea.all('input');
    }
    if ( inputs.length > 0 ) {
        // Change the first field's value to ContainerInputArray[2]
        // if present before focusing.
        var type = inputs[0].get('tagName').toLowerCase();
        if (ContainerInputArray[3]) {
            if ( type == "input" ) {
                inputs[0].set('value', ContainerInputArray[3]);
            } else {
                for (var i = 0; inputs[0].size(); i++) {
                    if ( inputs[0].get('options').item(i).get('value') == ContainerInputArray[3] ) { //To confirm the access of options NodeList here.
                        inputs[0].get('options').item(i).set('selected', true);
                        break;
                    }
                }
            }
        }
        // focus on the first field, this makes it easier to edit
        inputs[0].focus();
        if ( type == "input" || type == "textarea" ) {
            inputs[0].select();
        }
    }
    e.preventDefault();
}


/* checkForChangedFieldValues(e, array )
 * Function checks if after the autocomplete by the browser if the values match the originals.
 *   If they don't match then hide the text and show the input so users don't get confused.
 *
 * var e: the event
 * var ContainerInputArray: An array containing the (edit) and text area and the input being displayed
 * var ContainerInputArray[0]: the conainer that will be hidden usually shows the (edit) text
 * var ContainerInputArray[1]: the input area and label that will be displayed
 * var ContainerInputArray[2]: the field that is on the page, might get changed by browser autocomplete 
 * var ContainerInputArray[3]: the original value from the page loading.
 *
 */  
function checkForChangedFieldValues(e, ContainerInputArray ) {
    var el = document.getElementById(ContainerInputArray[2]);
    var unhide = false;
    if ( el ) {
        if ( !ContainerInputArray[4]
             && (el.value != ContainerInputArray[3]
                 || (el.value == "" && el.id != "alias" && el.id != "qa_contact")) )
        {
            unhide = true;
        }
        else {
            var set_default = document.getElementById("set_default_" +
                                                      ContainerInputArray[2]);
            if ( set_default ) {
                if(set_default.checked){
                    unhide = true;
                }
            }
        }
    }
    if(unhide){
        Y.one('#' + ContainerInputArray[0]).addClass('bz_default_hidden');
        Y.one('#' + ContainerInputArray[1]).removeClass('bz_default_hidden');
    }

}

function hideAliasAndSummary(short_desc_value, alias_value) {
    // check the short desc field
    hideEditableField( 'summary_alias_container','summary_alias_input',
                       'editme_action','short_desc', short_desc_value);  
    // check that the alias hasn't changed
    var bz_alias_check_array = new Array('summary_alias_container',
                                     'summary_alias_input', 'alias', alias_value);
    Y.on('load', checkForChangedFieldValues, null, bz_alias_check_array);
}

function showPeopleOnChange( field_id_list ) {
    for(var i = 0; i < field_id_list.length; i++) {
        Y.one('#' + field_id_list[i]).on('change', showEditableField, null,
                                      new Array('bz_qa_contact_edit_container',
                                                'bz_qa_contact_input'));
        Y.one('#' + field_id_list[i]).on('change',showEditableField, null,
                                      new Array('bz_assignee_edit_container',
                                                'bz_assignee_input'));
    }
}

function assignToDefaultOnChange(field_id_list, default_assignee, default_qa_contact) {
    showPeopleOnChange(field_id_list);
    for(var i = 0, l = field_id_list.length; i < l; i++) {
        Y.one('#' + field_id_list[i]).on('change', function(evt, defaults) {
            if (document.getElementById('assigned_to').value == defaults[0]) {
                setDefaultCheckbox(evt, 'set_default_assignee');//What is the use of passing evt as an argument. In the method definition the evt argument is not used.
            }
            if (document.getElementById('qa_contact')
                && document.getElementById('qa_contact').value == defaults[1])
            {
                setDefaultCheckbox(evt, 'set_default_qa_contact');
            }
        }, null, [default_assignee, default_qa_contact]);
    }
}

function initDefaultCheckbox(field_id){
    Y.one('#' + 'set_default_' + field_id).on('change', boldOnChange, null,
                                  'set_default_' + field_id);
    Y.on('load', checkForChangedFieldValues, null,
                                  new Array( 'bz_' + field_id + '_edit_container',
                                             'bz_' + field_id + '_input',
                                             'set_default_' + field_id ,'1'));
    
    Y.on('load', boldOnChange, null, 'set_default_' + field_id ); 
}

function showHideStatusItems(e, dupArrayInfo) {
    var el = document.getElementById('bug_status');
    // finish doing stuff based on the selection.
    if ( el ) { //// Should it be el or e ?
        showDuplicateItem(el); // Should it be el or e ?

        // Make sure that fields whose visibility or values are controlled
        // by "resolution" behave properly when resolution is hidden.
        var resolution = document.getElementById('resolution');
        if (resolution && resolution.options[0].value != '') {
            resolution.bz_lastSelected = resolution.selectedIndex;
            var emptyOption = new Option('', '');
            resolution.insertBefore(emptyOption, resolution.options[0]);
            emptyOption.selected = true;
        }
        Y.one('#resolution_settings').addClass('bz_default_hidden');
        var resolution_settings_warning = Y.one('#resolution_settings_warning');
        if (resolution_settings_warning) {
            resolution_settings_warning.addClass('bz_default_hidden');
        }
        var duplicate_display = Y.one('#duplicate_display'); //For testing
        if(duplicate_display)
        duplicate_display.addClass('bz_default_hidden');


        if ( (el.value == dupArrayInfo[1] && dupArrayInfo[0] == "is_duplicate")
             || bz_isValueInArray(close_status_array, el.value) ) 
        {
            Y.one('#resolution_settings').removeClass('bz_default_hidden');
            Y.one('#resolution_settings_warning').removeClass('bz_default_hidden');

            // Remove the blank option we inserted.
            if (resolution && resolution.options[0].value == '') {
                resolution.removeChild(resolution.options[0]);
                resolution.selectedIndex = resolution.bz_lastSelected;
            }
        }

        if (resolution) {
            bz_fireEvent(resolution, 'change');
        }
    }
}

function showDuplicateItem(e) {
    var resolution = document.getElementById('resolution');
    var bug_status = document.getElementById('bug_status');
    var dup_id = Y.one('#dup_id');
    if (resolution) {
        if (resolution.value == 'DUPLICATE' && bz_isValueInArray( close_status_array, bug_status.value) ) {
            // hide resolution show duplicate
            Y.one('#duplicate_settings').removeClass('bz_default_hidden');
            Y.one('#dup_id_discoverable').addClass('bz_default_hidden');
            // check to make sure the field is visible or IE throws errors
            if( ! dup_id.hasClass( 'bz_default_hidden' ) ){
                dup_id.focus();
                dup_id.select();
            }
        }
        else {
            Y.one('#duplicate_settings').addClass('bz_default_hidden');
            Y.one('#dup_id_discoverable').removeClass('bz_default_hidden');
            dup_id.blur();
        }
    }
    YAHOO.util.Event.preventDefault(e);//e.preventDefault(); //prevents the hyperlink from going to the url in the href.
}

function setResolutionToDuplicate(e, duplicate_or_move_bug_status) {
    var status = document.getElementById('bug_status');
    var resolution = document.getElementById('resolution');
    Y.one('#dup_id_discoverable').addClass('bz_default_hidden');
    status.value = duplicate_or_move_bug_status;
    bz_fireEvent(status, 'change');
    resolution.value = "DUPLICATE";
    bz_fireEvent(resolution, 'change');
    e.preventDefault();
}
    
function setDefaultCheckbox(e, field_id) {
    var el = document.getElementById(field_id);
    var elLabel = Y.one('#' + field_id + "_label");
    if( el && elLabel ) {
        el.checked = "true";
        elLabel.setStyle('fontWeight', 'bold');
    }
}

function boldOnChange(e, field_id){
    var el = document.getElementById(field_id);
    var elLabel = Y.one('#' + field_id + "_label");
    if( el && elLabel ) {
        if( el.checked ){
            elLabel.setStyle('fontWeight', 'bold');
        }
        else{
            elLabel.setStyle('fontWeight', 'normal');
        }
    }
}

function updateCommentTagControl(checkbox, field) {
    if (checkbox.checked) {
        Y.one('#' + field).addClass('bz_private');
    } else {
        Y.one('#' + field).removeClass('bz_private');
    }
}

/**
 * Reset the value of the classification field and fire an event change
 * on it.  Called when the product changes, in case the classification
 * field (which is hidden) controls the visibility of any other fields.
 */
function setClassification() {
    var classification = document.getElementById('classification');
    var product = document.getElementById('product');
    var selected_product = product.value; 
    var select_classification = all_classifications[selected_product];
    classification.value = select_classification;
    bz_fireEvent(classification, 'change');
}

/**
 * Says that a field should only be displayed when another field has
 * a certain value. May only be called after the controller has already
 * been added to the DOM.
 */
function showFieldWhen(controlled_id, controller_id, values) {
    var controller = Y.one('#' + controller_id);
    // Note that we don't get an object for "controlled" here, because it
    // might not yet exist in the DOM. We just pass along its id.
    controller.on('change',handleVisControllerValueChange, null,
                              [controlled_id, controller.getDOMNode(), values]);
}

/**
 * Called by showFieldWhen when a field's visibility controller 
 * changes values. 
 */
function handleVisControllerValueChange(e, args) {
    var controlled_id = args[0];
    var controller = args[1];
    var values = args[2];

    var label_container = Y.one('#field_label_' + controlled_id);
    var field_container = Y.one('field_container_' + controlled_id);
    var selected = false;
    for (var i = 0; i < values.length; i++) {
        if (bz_valueSelected(controller, values[i])) {
            selected = true;
            break;
        }
    }

    if (selected) {
        label_container.removeClass('bz_hidden_field');
        field_container.removeClass('bz_hidden_field');
    }
    else {
        label_container.addClass('bz_hidden_field');
        field_container.addClass('bz_hidden_field');
    }
}

/**
 * This is a data structure representing the tree of controlled values.
 * Let's call the "controller value" the "source" and the "controlled
 * value" the "target". A target can have only one source, but a source
 * can have an infinite number of targets.
 *
 * The data structure is a series of hash tables that go something
 * like this:
 *
 * source_field -> target_field -> source_value_id -> target_value_ids
 *
 * We always know source_field when our event handler is called, since
 * that's the field the event is being triggered on. We can then enumerate
 * through every target field, check the status of each source field value,
 * and act appropriately on each target value.
 */
var bz_value_controllers = {};
// This keeps track of whether or not we've added an onchange handler
// for the source field yet.
var bz_value_controller_has_handler = {};
function showValueWhen(target_field_id, target_value_ids,
                       source_field_id, source_value_id, empty_shows_all)
{
    if (!bz_value_controllers[source_field_id]) {
        bz_value_controllers[source_field_id] = {};
    }
    if (!bz_value_controllers[source_field_id][target_field_id]) {
        bz_value_controllers[source_field_id][target_field_id] = {};
    }
    var source_values = bz_value_controllers[source_field_id][target_field_id];
    source_values[source_value_id] = target_value_ids;

    if (!bz_value_controller_has_handler[source_field_id]) {
        var source_field = Y.one('#' + source_field_id);
        source_field.on('change', handleValControllerChange, null,
                                 [source_field.getDOMNode(), empty_shows_all]);
        bz_value_controller_has_handler[source_field_id] = true;
    }
}

function handleValControllerChange(e, args) {
    var source = args[0];
    var empty_shows_all = args[1];

    for (var target_field_id in bz_value_controllers[source.id]) {
        var target = document.getElementById(target_field_id);
        if (!target) continue;
        _update_displayed_values(source, target, empty_shows_all);
    }
}

/* See the docs for bz_option_duplicate count lower down for an explanation
 * of this data structure.
 */
var bz_option_hide_count = {};

function _update_displayed_values(source, target, empty_shows_all) {
    var show_all = (empty_shows_all && source.selectedIndex == -1);

    bz_option_hide_count[target.id] = {};

    var source_values = bz_value_controllers[source.id][target.id];
    for (source_value_id in source_values) {
        var source_option = getPossiblyHiddenOption(source, source_value_id);
        var target_values = source_values[source_value_id];
        for (var i = 0; i < target_values.length; i++) {
            var target_value_id = target_values[i];
            _handle_source_target(source_option, target, target_value_id,
                                  show_all);
        }
    }

    // We may have updated which elements are selected or not selected
    // in the target field, and it may have handlers associated with
    // that, so we need to fire the change event on the target.
    bz_fireEvent(target, 'change');
}

function _handle_source_target(source_option, target, target_value_id,
                               show_all)
{
    var target_option = getPossiblyHiddenOption(target, target_value_id);

    // We always call either _show_option or _hide_option on every single
    // target value. Although this is not theoretically the most efficient
    // thing we can do, it handles all possible edge cases, and there are
    // a lot of those, particularly when this code is being used on the
    // search form.
    if (source_option.selected || (show_all && !source_option.disabled)) {
        _show_option(target_option, target);
    }
    else {
        _hide_option(target_option, target);
    }
}

/* When an option has duplicates (see the docs for bz_option_duplicates
 * lower down in this file), we only want to hide it if *all* the duplicates
 * would be hidden. So we keep a counter of how many duplicates each option
 * has. Then, when we run through a "change" call for a source field,
 * we count how many times each value gets hidden, and only actually
 * hide it if the counter hits a number higher than the duplicate count.
 */
var bz_option_duplicate_count = {};

function _show_option(option, field) {
    if (!option.disabled) return;
    option = showOptionInIE(option, field);
    Y.Node(option).removeClass('bz_hidden_option');// Using the Node contructor to get the YUI3 node.
    option.disabled = false;
}

function _hide_option(option, field) {
    if (option.disabled) return;

    var value_id = option.bz_value_id;

    if (field.id in bz_option_duplicate_count
        && value_id in bz_option_duplicate_count[field.id])
    {
        if (!bz_option_hide_count[field.id][value_id]) {
            bz_option_hide_count[field.id][value_id] = 0;
        }
        bz_option_hide_count[field.id][value_id]++;
        var current = bz_option_hide_count[field.id][value_id];
        var dups    = bz_option_duplicate_count[field.id][value_id];
        // We check <= because the value in bz_option_duplicate_count is
        // 1 less than the total number of duplicates (since the shown
        // option is also a "duplicate" but not counted in
        // bz_option_duplicate_count).
        if (current <= dups) return;
    }

    Y.Node(option).addClass('bz_hidden_option');
    option.selected = false;
    option.disabled = true;
    hideOptionInIE(option, field);
}

// A convenience function to generate the "id" tag of an <option>
// based on the numeric id that Bugzilla uses for that value.
function _value_id(field_name, id) {
    return 'v' + id + '_' + field_name;
}

/*********************************/
/* Code for Hiding Options in IE */
/*********************************/

/* IE 7 and below (and some other browsers) don't respond to "display: none"
 * on <option> tags. However, you *can* insert a Comment Node as a
 * child of a <select> tag. So we just insert a Comment where the <option>
 * used to be. */
var ie_hidden_options = {};
function hideOptionInIE(anOption, aSelect) {
    if (browserCanHideOptions(aSelect)) return;

    var commentNode = document.createComment(anOption.value);
    commentNode.id = anOption.id;
    // This keeps the interface of Comments and Options the same for
    // our other functions.
    commentNode.disabled = true;
    // replaceChild is very slow on IE in a <select> that has a lot of
    // options, so we use replaceNode when we can.
    if (anOption.replaceNode) {
        anOption.replaceNode(commentNode);
    }
    else {
        aSelect.replaceChild(commentNode, anOption);
    }

    // Store the comment node for quick access for getPossiblyHiddenOption
    if (!ie_hidden_options[aSelect.id]) {
        ie_hidden_options[aSelect.id] = {};
    }
    ie_hidden_options[aSelect.id][anOption.id] = commentNode;
}

function showOptionInIE(aNode, aSelect) {
    if (browserCanHideOptions(aSelect)) return aNode;

    // We do this crazy thing with innerHTML and createElement because
    // this is the ONLY WAY that this works properly in IE.
    var optionNode = document.createElement('option');
    optionNode.innerHTML = aNode.data;
    optionNode.value = aNode.data;
    optionNode.id = aNode.id;
    // replaceChild is very slow on IE in a <select> that has a lot of
    // options, so we use replaceNode when we can.
    if (aNode.replaceNode) {
        aNode.replaceNode(optionNode);
    }
    else {
        aSelect.replaceChild(optionNode, aNode);
    }
    delete ie_hidden_options[aSelect.id][optionNode.id];
    return optionNode;
}

function initHidingOptionsForIE(select_name) {
    var aSelect = document.getElementById(select_name);
    if (browserCanHideOptions(aSelect)) return;
    if (!aSelect) return;

    for (var i = 0; ;i++) {
        var item = aSelect.options[i];
        if (!item) break;
        if (item.disabled) {
          hideOptionInIE(item, aSelect);
          i--; // Hiding an option means that the options array has changed.
        }
    }
}

/* Certain fields, like the Component field, have duplicate values in
 * them (the same name, but different ids). We don't display these
 * duplicate values in the UI, but the option hiding/showing code still
 * uses the ids of these unshown duplicates. So, whenever we get the
 * id of an unshown duplicate in getPossiblyHiddenOption, we have to
 * return the actually-used <option> instead.
 *
 * The structure of the data looks like:
 *
 *  field_name -> unshown_value_id -> shown_value_id_it_is_a_duplicate_of
 */
var bz_option_duplicates = {};

function getPossiblyHiddenOption(aSelect, optionId) {

    if (bz_option_duplicates[aSelect.id]
        && bz_option_duplicates[aSelect.id][optionId])
    {
        optionId = bz_option_duplicates[aSelect.id][optionId];
    }

    // Works always for <option> tags, and works for commentNodes
    // in IE (but not in Webkit).
    var id = _value_id(aSelect.id, optionId);
    var val = document.getElementById(id);

    // This is for WebKit and other browsers that can't "display: none"
    // an <option> and also can't getElementById for a commentNode.
    if (!val && ie_hidden_options[aSelect.id]) {
        val = ie_hidden_options[aSelect.id][id];
    }

    // We add this property for our own convenience, it's used in
    // other places.
    val.bz_value_id = optionId;

    return val;
}

var browser_can_hide_options;
function browserCanHideOptions(aSelect) {
    /* As far as I can tell, browsers that don't hide <option> tags
     * also never have a X position for <option> tags, even if
     * they're visible. This is the only reliable way I found to
     * differentiate browsers. So we create a visible option, see
     * if it has a position, and then remove it. */
    if (typeof(browser_can_hide_options) == "undefined") {
        var new_opt = bz_createOptionInSelect(aSelect, '', '');
        var opt_pos = Y.Node(new_opt).getX();
        aSelect.removeChild(new_opt);
        if (opt_pos) {
            browser_can_hide_options = true;
        }
        else {
            browser_can_hide_options = false;
        }
    }
    return browser_can_hide_options;
}

/* (end) option hiding code */

/**
 * The Autoselect
 */
YUI.bugzilla.userAutocomplete = {
    counter : 0,
    dataSource : null,
    generateRequest : function ( enteredText ){ 
      YUI.bugzilla.userAutocomplete.counter = 
                                   YUI.bugzilla.userAutocomplete.counter + 1;
      Y.io.header('Content-Type', 'application/json'); // Sets the default Header
      var json_object = {
          method : "User.get",
          id : YUI.bugzilla.userAutocomplete.counter,
          params : [ { 
            Bugzilla_api_token: BUGZILLA.api_token,
            match : [ decodeURIComponent(enteredText) ],
            include_fields : [ "name", "real_name" ]
          } ]
      };
      var stringified =  Y.JSON.stringify(json_object);
      return stringified;
    },
    resultListFormat : function(query, results) {
        return Y.Array.map(results, function(result){
            return (Y.Escape.html(result.raw.real_name) + " (" + Y.Escape.html(result.raw.name) + ")");
        });
    },
    init_ds : function(){
        var new_ds = new Y.DataSource.IO({
            source: "jsonrpc.cgi", ioConfig: { method: "POST",
              headers: {'Content-Type': 'application/json'} }
        });
        new_ds.plug(Y.Plugin.DataSourceJSONSchema, {
            schema: {
                resultListLocator: "result.users",
                resultFields: [
                    { key : "name" },
                    { key : "real_name"}
                ],
                metaFields: { error: "error", jsonRpcId: "id"}
            }
        }).plug(Y.Plugin.DataSourceCache, { max: 5 });
        
        this.dataSource = new_ds;
    },
    init : function( field, container, multiple ) {
        if( this.dataSource == null ){
            this.init_ds();  
        }
        var userAutoComp = new Y.AutoComplete({
            inputNode: '#' + field,
            render: '#' + container,
            source: this.dataSource,
            requestTemplate: this.generateRequest,
            resultFormatter: this.resultListFormat,
            maxResults: BUGZILLA.param.maxusermatches,
            minQueryLength: 3,
            queryDelay: 0.05
        });
        if( multiple == true ){
            userAutoComp.set('queryDelimiter', ',');
        }
        userAutoComp.render();
    }
};

YUI.bugzilla.fieldAutocomplete = {
    dataSource : [],
    init_ds : function( field ) {
        this.dataSource[field] =
          new Y.DataSource.Local( { source: YUI.bugzilla.field_array[field] } );
          this.dataSource[field].sendRequest();
          Y.log(this.dataSource);
          //new YAHOO.util.LocalDataSource( YAHOO.bugzilla.field_array[field] );
    },
    init : function( field, container ) {
        if( this.dataSource[field] == null ) {
            this.init_ds( field );
        }
        var fieldAutoComp =
          new Y.AutoComplete({
            inputNode: '#' + field,
            render: '#' + container,
            source: this.dataSource[field],
            maxResults: YUI.bugzilla.field_array[field].length,
            resultFormatter: function(query, results){
                Y.log(results);
                return Y.Array.map(results, function(result){
                    return Y.Escape.html(result.raw);
                });
            },
            minQueryLength: 0,
            queryDelimiter: ',', //[","," "], // Are we allowed to use the array of delimiters in YUI 3?
            queryDelay: 0,
          });
         //fieldAutoComp.render(); 

          /*
        fieldAutoComp.maxResultsDisplayed = YAHOO.bugzilla.field_array[field].length;
        fieldAutoComp.formatResult = fieldAutoComp.formatEscapedResult;
        fieldAutoComp.minQueryLength = 0;
        fieldAutoComp.useIFrame = true;
        fieldAutoComp.delimChar = [","," "];
        fieldAutoComp.resultTypeList = false;
        fieldAutoComp.queryDelay = 0;
        
        */
        /*  Causes all the possibilities in the field to appear when a user
         *  focuses on the textbox
         */
        //*********************************
        //Commentec out
        /*
        fieldAutoComp.on('focusedChange', function(){
            var sInputValue = Y.one('#' + field).get('value');
            if( sInputValue.length === 0
                && YUI.bugzilla.field_array[field].length > 0 ){
                this.sendRequest(sInputValue);
                this.disable(); // or visible attribute ? 
                this.enable();
            }
        });
        */
        /*
        fieldAutoComp.textboxFocusEvent.subscribe( function(){ // http://yuilibrary.com/yui/docs/api/classes/AutoCompleteList.html , focused attribute. ?
            var sInputValue = YAHOO.util.Dom.get(field).value;
            if( sInputValue.length === 0
                && YAHOO.bugzilla.field_array[field].length > 0 ){
                this.sendQuery(sInputValue); // http://yuilibrary.com/yui/docs/api/classes/Plugin.AutoComplete.html#method_sendRequest
                this.collapseContainer(); // http://yuilibrary.com/yui/docs/api/classes/Plugin.AutoComplete.html#attr_disabled ?
                this.expandContainer(); // http://yuilibrary.com/yui/docs/api/classes/Plugin.AutoComplete.html#method_enable ?
            }
        });
        */
        //**********************************
        /*fieldAutoComp.dataRequestEvent.subscribe( function(type, args) {
            args[0].autoHighlight = args[1] != ''; // Need help understanding what this code does ?
        });
        */
    }
};

/**
 * Set the disable email checkbox to true if the user has disabled text
 */
function userDisabledTextOnChange(disabledtext) {
    var disable_mail = document.getElementById('disable_mail');
    if (disabledtext.value === "" && !disable_mail_manually_set) {
        disable_mail.checked = false;
    }
    if (disabledtext.value !== "" && !disable_mail_manually_set) {
        disable_mail.checked = true;
    }
}

/**
 * Force the browser to honour the selected option when a page is refreshed,
 * but only if the user hasn't explicitly selected a different option.
 */
function initDirtyFieldTracking() {
    // old IE versions don't provide the information we need to make this fix work
    // however they aren't affected by this issue, so it's ok to ignore them
    if (Y.UA.ie > 0 && Y.UA.ie <= 8) return;
    var selects = document.getElementById('changeform').getElementsByTagName('select');
    for (var i = 0, l = selects.length; i < l; i++) {
        var el = selects[i];
        var el_dirty = document.getElementById(el.name + '_dirty');
        if (!el_dirty) continue;
        if (!el_dirty.value) {
            var preSelected = bz_preselectedOptions(el);
            if (!el.multiple) {
                preSelected.selected = true;
            } else {
                el.selectedIndex = -1;
                for (var j = 0, m = preSelected.length; j < m; j++) {
                    preSelected[j].selected = true;
                }
            }
        }

        Y.Node(el).on("change", function(e) { // Should we convert the el to a Node instance like this or convert el into a node instance everywhere in this function ?
            var el = e.target || e.srcElement;
            var preSelected = bz_preselectedOptions(el.getDOMNode());
            var currentSelected = bz_selectedOptions(el.getDOMNode());
            var isDirty = false;
            if (!el.get('multiple')) {
                isDirty = preSelected.index != currentSelected.index;
            } else {
                if (preSelected.length != currentSelected.length) {
                    isDirty = true;
                } else {
                    for (var i = 0, l = preSelected.length; i < l; i++) {
                        if (currentSelected[i].index != preSelected[i].index) {
                            isDirty = true;
                            break;
                        }
                    }
                }
            }
            document.getElementById(el.get('name') + '_dirty').value = isDirty ? '1' : '';
        });
    }
}

/**
 * Comment preview
 */

var last_comment_text = '';

function show_comment_preview(bug_id) {
    //var Dom = YAHOO.util.Dom;
    var comment = Y.one('#comment');
    var preview = Y.one('#comment_preview');

    if (!comment || !preview) return;
    if (Y.one('#comment_preview_tab').hasClass('active_comment_tab')) return;

    preview.getDOMNode().style.width = (comment.get('clientWidth') - 4) + 'px';
    preview.getDOMNode().style.height = comment.get('offsetHeight') + 'px';

    var comment_tab = Y.one('#comment_tab');
    comment.addClass('bz_default_hidden');
    comment_tab.removeClass('active_comment_tab');
    comment_tab.setAttribute('aria-selected', 'false');

    var preview_tab = Y.one('#comment_preview_tab');
    preview.removeClass('bz_default_hidden');
    preview_tab.addClass('active_comment_tab');
    preview_tab.setAttribute('aria-selected', 'true');

    Y.one('#comment_preview_error').addClass('bz_default_hidden');

    if (last_comment_text == comment.get('value'))
        return;

    Y.one('#comment_preview_text').addClass('bz_default_hidden');
    Y.one('#comment_preview_loading').removeClass('bz_default_hidden');

    Y.io.header('Content-Type', 'application/json');
    var callbacks = {
        success: function(id, res) { // To confirm whether the res object has been used correctly in the function ?
            data = Y.JSON.parse(res.responseText);
            if (data.error) {
                Y.one('#comment_preview_loading').addClass('bz_default_hidden');
                var comment_preview_error = Y.one('#comment_preview_error');
                comment_preview_error.removeClass('bz_default_hidden');
                comment_preview_error.set('innerHTML', Y.Escape.html(data.error.message));
            // or comment_preview_error.set('text',data.error.message); ?
            } else {
                var comment_preview_text = Y.one('#comment_preview_text');
                comment_preview_text.set('innerHTML', data.result.html);
                Y.one('#comment_preview_loading').addClass('bz_default_hidden');
                Y.one('#comment_preview_text').removeClass('bz_default_hidden');
                last_comment_text = comment.get('value');
            }
        },
        failure: function(id, res) {
            Y.one('#comment_preview_loading').addClass('bz_default_hidden');
            var comment_preview_error = Y.one('#comment_preview_error');
            comment_preview_error.removeClass('bz_default_hidden');
            comment_preview_error.set('innerHTML', Y.Escape.html(res.responseText));
            //or comment_preview_error.set('text',res.responseText); ?
        }
    };
    var post_data = Y.JSON.stringify({
        version: "1.1",
        method: 'Bug.render_comment',
        params: {
            Bugzilla_api_token: BUGZILLA.api_token,
            id: bug_id,
            text: comment.get('value')
        }
    });
    Y.io('jsonrpc.cgi',{
        method: 'POST',
        data: post_data,
        headers: {'Content-Type': 'application/json'},
        on: callbacks
                    
    });
}

function show_comment_edit() {
    var comment = Y.one('#comment');
    var preview = Y.one('#comment_preview');
    if (!comment || !preview) return;
    if (comment.hasClass('active_comment_tab')) return;

    var preview_tab = Y.one('#comment_preview_tab');
    preview.addClass('bz_default_hidden');
    preview_tab.removeClass('active_comment_tab');
    preview_tab.setAttribute('aria-selected', 'false');

    var comment_tab = Y.one('#comment_tab');
    comment.removeClass('bz_default_hidden');
    comment_tab.addClass('active_comment_tab');
    comment_tab.setAttribute('aria-selected', 'true');
}

function adjustRemainingTime() {
    // subtracts time spent from remaining time
    // prevent negative values if work_time > bz_remaining_time
    var new_time = Math.max(bz_remaining_time - document.changeform.work_time.value, 0.0);
    // get upto 2 decimal places
    document.changeform.remaining_time.value = Math.round(new_time * 100)/100;
}

function updateRemainingTime() {
    // if the remaining time is changed manually, update bz_remaining_time
    bz_remaining_time = document.changeform.remaining_time.value;
}
