/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This Source Code Form is "Incompatible With Secondary Licenses", as
 * defined by the Mozilla Public License, v. 2.0.
 */

function show_mini_login_form( suffix ) {
    var login_link = Y.one('#login_link' + suffix);
    var login_form = Y.one('#mini_login' + suffix);
    var account_container = Y.one('#new_account_container'
                                                    + suffix);

    login_link.addClass('bz_default_hidden');
    login_form.removeClass('bz_default_hidden');
    account_container.addClass('bz_default_hidden');
    return false;
}

function hide_mini_login_form( suffix ) {
    var login_link = Y.one('#login_link' + suffix);
    var login_form = Y.one('#mini_login' + suffix);
    var account_container = Y.one('#new_account_container' + suffix);

    login_link.removeClass('bz_default_hidden');
    login_form.addClass('bz_default_hidden');
    account_container.removeClass('bz_default_hidden');
    return false;
}

function show_forgot_form( suffix ) {
    var forgot_link = Y.one('#forgot_link' + suffix);
    var forgot_form = Y.one('#forgot_form' + suffix);
    var login_container = Y.one('#mini_login_container' + suffix);
    
    forgot_link.addClass('bz_default_hidden');
    forgot_form.removeClass('bz_default_hidden');
    login_container.addClass('bz_default_hidden');
    return false;
}

function hide_forgot_form( suffix ) {
    var forgot_link = Y.one('#forgot_link' + suffix);
    var forgot_form = Y.one('#forgot_form' + suffix);
    var login_container = Y.one('#mini_login_container' + suffix);
    
    forgot_link.removeClass('bz_default_hidden');
    forgot_form.addClass('bz_default_hidden');
    login_container.removeClass('bz_default_hidden');
    return false;
}

function set_language( value ) {
    Y.Cookie.set('LANG', value,
    {
        expires: new Date('January 1, 2038'),
        path: BUGZILLA.param.cookie_path
    });
    window.location.reload()
}

// This basically duplicates Bugzilla::Util::display_value for code that
// can't go through the template and has to be in JS.
function display_value(field, value) {
    var field_trans = BUGZILLA.value_descs[field];
    if (!field_trans) return value;
    var translated = field_trans[value];
    if (translated) return translated;
    return value;
}
