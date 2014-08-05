/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This Source Code Form is "Incompatible With Secondary Licenses", as
 * defined by the Mozilla Public License, v. 2.0. */

//var Dom = YAHOO.util.Dom;

YUI.bugzilla.commentTagging = {
    ctag_div  : false,
    ctag_add  : false,
    counter   : 0,
    min_len   : 3,
    max_len   : 24,
    tags_by_no: {},
    nos_by_tag: {},
    current_id: 0,
    current_no: -1,
    can_edit  : false,
    pending   : {},

    requestTemplate : function(query) {
        query = Y.Lang.trim(query);
        YUI.bugzilla.commentTagging.last_query = query;
        YUI.bugzilla.commentTagging.counter = YUI.bugzilla.commentTagging.counter + 1;
        Y.io.header('Content-Type', 'application/json'); // Sets the default Header
        return Y.JSON.stringify({
            version: "1.1",
            method : "Bug.search_comment_tags",
            id : YUI.bugzilla.commentTagging.counter,
            params : {
                    Bugzilla_api_token: BUGZILLA.api_token,
                    query : query,
                    limit : 10
                }
        });
    },

    init : function(can_edit) {
        this.can_edit = can_edit;
        this.ctag_div = Y.one('#bz_ctag_div');
        this.ctag_add = Y.one('#bz_ctag_add');
        this.ctag_add.on('keypress', this.onKeyPress);
        Y.on('domready' ,function() {
            YUI.bugzilla.commentTagging.updateCollapseControls();
        });
        if (!can_edit) return;

        var ds = new Y.DataSource.IO({ source: "jsonrpc.cgi" , ioConfig: { method: "POST",
              headers: {'Content-Type': 'application/json'}
         }});
        ds.plug(Y.Plugin.DataSourceJSONSchema, {
            schema: {
                resultListLocator: "result",
                metaFields : { error: "error", jsonRpcId: "id"}
            }
        }).plug(Y.Plugin.DataSourceCache, { max: 5 });
        /* 
            
        ds.sendRequest({
            request: Y.JSON.stringify({
            method : "Bug.search_comment_tags",
            id : YUI.bugzilla.commentTagging.counter,
            params : {
                    Bugzilla_api_token: BUGZILLA.api_token,
                    query : 'aaaa',
                    limit : 10
                }
            }),
            on: {
                success : function(e){Y.log(e);},
                failure : function(e){Y.log(e.error.message);Y.log("Error");}
            },
            cfg:{method: 'POST', headers: {'Content-Type': 'application/json'}}
            
        });
    */

    // The main problem here is that a GET request is sent but no effect takes place. The JSON-RPC calls aren't being made here.
        var ac = new Y.AutoComplete({
            inputNode: '#bz_ctag_add',
            render: '#bz_ctag_autocomp',
            source: ds,
            requestTemplate: this.requestTemplate,
            maxResults: 7,
            minQueryLength: this.min_len,
            queryDelay: 0.5,
        });
        ac.render();
        //*********************************************
        /*ac.on('results', function(results_array){ // is results the right event to use here in place of dataReturnEvent of YUI2 ?
         Y.log(results_array);// What is the format of the data , how to use it ? Is autoHighlight a property of the data received. ?
        });*/
        /*
        var ac = new YAHOO.widget.AutoComplete('bz_ctag_add', 'bz_ctag_autocomp', ds);
        ac.maxResultsDisplayed = 7;
        ac.generateRequest = function(query) {
            query = YAHOO.lang.trim(query);
            YAHOO.bugzilla.commentTagging.last_query = query;
            YAHOO.bugzilla.commentTagging.counter = YAHOO.bugzilla.commentTagging.counter + 1;
            YAHOO.util.Connect.setDefaultPostHeader('application/json', true);
            return YAHOO.lang.JSON.stringify({
                method : "Bug.search_comment_tags",
                id : YAHOO.bugzilla.commentTagging.counter,
                params : {
                    Bugzilla_api_token: BUGZILLA.api_token,
                    query : query,
                    limit : 10
                }
            });
        };
        ac.minQueryLength = this.min_len;
        ac.autoHighlight = false;
        ac.typeAhead = true; // What will be the equivalent here ?
        ac.queryDelay = 0.5;
            ac.dataReturnEvent.subscribe(function(type, args) { // Will we use the results event here ?
            args[0].autoHighlight = args[2].length == 1;
        });
        */
    },

    toggle : function(comment_id, comment_no) {
        if (!this.ctag_div) return;
        var tags_container = Y.one('#ct_' + comment_no);

        if (this.current_id == comment_id) {
            // hide
            this.current_id = 0;
            this.current_no = -1;
            this.ctag_div.addClass('bz_default_hidden');
            this.hideError();
            window.focus();

        } else {
            // show or move
            this.rpcRefresh(comment_id, comment_no);
            this.current_id = comment_id;
            this.current_no = comment_no;
            this.ctag_add.set('value', '');
            tags_container.ancestor().insertBefore(this.ctag_div, tags_container);
            this.ctag_div.removeClass('bz_default_hidden');
            tags_container.removeClass('bz_default_hidden');
            var comment = Y.one('#comment_text_' + comment_no);
            if (comment.hasClass('collapsed')) {
                var link = Y.one('#comment_link_' + comment_no);
                expand_comment(link, comment, comment_no);
            }
            window.setTimeout(function() {
                YUI.bugzilla.commentTagging.ctag_add.focus();
            }, 50);
        }
    },

    hideInput : function() {
        if (this.current_id != 0) {
            this.toggle(this.current_id, this.current_no);
        }
        this.hideError();
    },

    showError : function(comment_id, comment_no, error) {
        var bz_ctag_error = Y.one('#bz_ctag_error');
        var tags_container = Y.one('#ct_' + comment_no);
        tags_container.ancestor().appendChild(bz_ctag_error);
        //tags_container.parentNode.appendChild(bz_ctag_error, tags_container);  To ask the significane of second parameter.
        Y.one('#bz_ctag_error_msg').set('innerHTML', Y.Escape.html(error));
        bz_ctag_error.removeClass('bz_default_hidden');
    },

    hideError : function() {
        Y.one('#bz_ctag_error').addClass('bz_default_hidden');
    },

    onKeyPress : function(evt) {
        evt = evt || window.event;
        var charCode = evt.charCode || evt.keyCode;
        if (evt.keyCode == 27) {
            // escape
            YUI.bugzilla.commentTagging.hideInput();
            evt.halt(); // http://yuilibrary.com/yui/docs/api/modules/event.html
            //YAHOO.util.Event.stopEvent(evt);//http://yui.github.io/yui2/docs/yui_2.9.0_full/docs/YAHOO.util.Event.html#method_stopEvent

        } else if (evt.keyCode == 13) {
            // return
            evt.halt();
            var tags = YUI.bugzilla.commentTagging.ctag_add.get('value').split(/[ ,]/);
            var comment_id = YUI.bugzilla.commentTagging.current_id;
            var comment_no = YUI.bugzilla.commentTagging.current_no;
            YUI.bugzilla.commentTagging.hideInput();
            try {
                YUI.bugzilla.commentTagging.add(comment_id, comment_no, tags);
            } catch(e) {
                YUI.bugzilla.commentTagging.showError(comment_id, comment_no, e.message);
            }
        }
    },

    showTags : function(comment_id, comment_no, tags) {
        // remove existing tags
        var tags_container = Y.one('#ct_' + comment_no);
        while (tags_container.hasChildNodes()) {
            tags_container.removeChild(tags_container.get('lastChild'));
        }
        // add tags
        if (tags != '') {
            if (typeof(tags) == 'string') {
                tags = tags.split(',');
            }
            for (var i = 0, l = tags.length; i < l; i++) {
                tags_container.appendChild(this.buildTagHtml(comment_id, comment_no, tags[i]));
            }
        }
        // update tracking array
        this.tags_by_no['c' + comment_no] = tags;
        this.updateCollapseControls();
    },

    updateCollapseControls : function() {
        var container = Y.one('#comment_tags_collapse_expand_container');
        if (!container) return;
        // build list of tags
        this.nos_by_tag = {};
        for (var id in this.tags_by_no) {
            if (this.tags_by_no.hasOwnProperty(id)) {
                for (var i = 0, l = this.tags_by_no[id].length; i < l; i++) {
                    var tag = this.tags_by_no[id][i].toLowerCase();
                    if (!this.nos_by_tag.hasOwnProperty(tag)) {
                        this.nos_by_tag[tag] = [];
                    }
                    this.nos_by_tag[tag].push(id);
                }
            }
        }
        var tags = [];
        for (var tag in this.nos_by_tag) {
            if (this.nos_by_tag.hasOwnProperty(tag)) {
                tags.push(tag);
            }
        }
        tags.sort();
        if (tags.length) {
            // Can we do this: var div = Y.Node.create('<div><ul id="comment_tags_collapse_expand"></ul></div>'); ? Will then ul be a node or a DOM element ? 
            var div = Y.Node.create('<div></div>');
            div.appendChild(Y.Node(document.createTextNode('Comment Tags:'))); // How do we create a TextNode in YUI3 ?
            var ul = Y.Node.create('<ul id = "comment_tags_collapse_expand"></ul>');
            //ul.set('id', 'comment_tags_collapse_expand');  // is it required ?
            div.appendChild(ul);
            for (var i = 0, l = tags.length; i < l; i++) {
                var tag = tags[i];
                var li = Y.Node.create('<li></li>');
                ul.appendChild(li);
                var a = Y.Node.create('<a href = "#"></a>');
                li.appendChild(a);
                //a.set('href', '#'); Is it required ?
                a.on('click', function(evt, tag) {
                    YUI.bugzilla.commentTagging.toggleCollapse(tag);
                    evt.halt();
                }, null, tag);
                li.appendChild(Y.Node(document.createTextNode(' (' + this.nos_by_tag[tag].length + ')')));
                a.set('innerHTML', Y.Escape.html(tag));
            }
            while (container.hasChildNodes()) {
                container.removeChild(container.get('lastChild'));
            }
            container.appendChild(div);
        } else {
            while (container.hasChildNodes()) {
                container.removeChild(container.get('lastChild'));
            }
        }
    },

    toggleCollapse : function(tag) {
        var nos = this.nos_by_tag[tag];
        if (!nos) return;
        toggle_all_comments('collapse');
        for (var i = 0, l = nos.length; i < l; i++) {
            var comment_no = nos[i].match(/\d+$/)[0];
            var comment = Y.one('#comment_text_' + comment_no);
            var link = Y.one('#comment_link_' + comment_no);
            expand_comment(link, comment, comment_no);
        }
    },

    buildTagHtml : function(comment_id, comment_no, tag) {
        var el = Y.Node.create('<span></span>');
        el.set('id', 'ct_' + comment_no + '_' + tag);
        el.addClass('bz_comment_tag');
        if (this.can_edit) {
            var a = Y.Node.create('<a></a>');
            a.set('href', '#');
            a.on('click', function(evt, args) {
                YUI.bugzilla.commentTagging.remove(args[0], args[1], args[2])
                evt.halt();
            },null, [comment_id, comment_no, tag]);
            a.appendChild(Y.Node(document.createTextNode('x')));
            el.appendChild(a);
            el.appendChild(Y.Node(document.createTextNode("\u00a0")));
        }
        el.appendChild(Y.Node(document.createTextNode(tag)));
        return el;
    },

    add : function(comment_id, comment_no, add_tags) {
        // build list of current tags from html
        var tags = new Array();
        var spans = Y.one('#ct_' + comment_no).all('.bz_comment_tag');
        for (var i = 0, l = spans.size(); i < l; i++) {
            tags.push(spans.item(i).get('textContent').substr(2));
        }
        // add new tags
        var new_tags = new Array();
        for (var i = 0, l = add_tags.length; i < l; i++) {
            var tag = Y.Lang.trim(add_tags[i]);
            // validation
            if (tag == '')
                continue;
            if (tag.length < YUI.bugzilla.commentTagging.min_len)
                throw new Error("Comment tags must be at least " + this.min_len + " characters.");
            if (tag.length > YUI.bugzilla.commentTagging.max_len)
                throw new Error("Comment tags cannot be longer than " + this.min_len + " characters.");
            // append new tag
            if (bz_isValueInArrayIgnoreCase(tags, tag))
                continue;
            new_tags.push(tag);
            tags.push(tag);
        }
        tags.sort();
        // update
        this.showTags(comment_id, comment_no, tags);
        this.rpcUpdate(comment_id, comment_no, new_tags, undefined);
    },

    remove : function(comment_id, comment_no, tag) {
        var el = Y.one('#ct_' + comment_no + '_' + tag);
        if (el) {
            el.ancestor().removeChild(el);
            this.rpcUpdate(comment_id, comment_no, undefined, [ tag ]);
        }
    },

    // If multiple updates are triggered quickly, overlapping refresh events
    // are generated. We ignore all events except the last one.
    incPending : function(comment_id) {
        if (this.pending['c' + comment_id] == undefined) {
            this.pending['c' + comment_id] = 1;
        } else {
            this.pending['c' + comment_id]++;
        }
    },

    decPending : function(comment_id) {
        if (this.pending['c' + comment_id] != undefined)
            this.pending['c' + comment_id]--;
    },

    hasPending : function(comment_id) {
        return this.pending['c' + comment_id] != undefined
               && this.pending['c' + comment_id] > 0;
    },

    rpcRefresh : function(comment_id, comment_no, noRefreshOnError) {
        this.incPending(comment_id);
        Y.io.header('Content-Type', 'application/json'); // Sets the default Header
        Y.io('jsonrpc.cgi', {
            method: 'POST',
            data: Y.JSON.stringify({
                    version: "1.1",
                    method: 'Bug.comments',
                    params: {
                        Bugzilla_api_token: BUGZILLA.api_token,
                        comment_ids: [ comment_id ],
                        include_fields: [ 'tags' ]
                    }
            }),
            headers: {'Content-Type': 'application/json'},
            on: {
                success: function(id, res) {
                    YUI.bugzilla.commentTagging.decPending(comment_id);
                    data = Y.JSON.parse(res.responseText);
                    if (data.error) {
                        YUI.bugzilla.commentTagging.handleRpcError(
                            comment_id, comment_no, data.error.message, noRefreshOnError);
                        return;
                    }
                    if (!YUI.bugzilla.commentTagging.hasPending(comment_id))
                        YUI.bugzilla.commentTagging.showTags(
                            comment_id, comment_no, data.result.comments[comment_id].tags);
                },
                failure: function(id, res) {
                    YUI.bugzilla.commentTagging.decPending(comment_id);
                    YUI.bugzilla.commentTagging.handleRpcError(
                        comment_id, comment_no, res.responseText, noRefreshOnError);
                }
            }        
        });
    },

    rpcUpdate : function(comment_id, comment_no, add, remove) {
        this.incPending(comment_id);
        Y.io.header('Content-Type', 'application/json'); // Sets the default Header
        Y.io('jsonrpc.cgi', {
            method: 'POST',
            data:  Y.JSON.stringify({
                       version: "1.1",
                       method: 'Bug.update_comment_tags',
                       params: {
                            Bugzilla_api_token: BUGZILLA.api_token,
                            comment_id: comment_id,
                            add: add,
                            remove: remove
                       }
            }),
            headers: {'Content-Type': 'application/json'},
            on: {
                success: function(id, res) {
                    YUI.bugzilla.commentTagging.decPending(comment_id);
                    data = Y.JSON.parse(res.responseText);
                    if (data.error) {
                        YUI.bugzilla.commentTagging.handleRpcError(comment_id, comment_no, data.error.message);
                        return;
                    }
                    if (!YUI.bugzilla.commentTagging.hasPending(comment_id))
                        YUI.bugzilla.commentTagging.showTags(comment_id, comment_no, data.result);
                },
            
                failure: function(id, res) {
                    YUI.bugzilla.commentTagging.decPending(comment_id);
                    YUI.bugzilla.commentTagging.handleRpcError(comment_id, comment_no, res.responseText);
                }
            }
        });
    },

    handleRpcError : function(comment_id, comment_no, message, noRefreshOnError) {
        YUI.bugzilla.commentTagging.showError(comment_id, comment_no, message);
        if (!noRefreshOnError) {
            YUI.bugzilla.commentTagging.rpcRefresh(comment_id, comment_no, true);
        }
    }
}
