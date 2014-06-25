/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This Source Code Form is "Incompatible With Secondary Licenses", as
 * defined by the Mozilla Public License, v. 2.0.
 */

// Shows or hides a requestee field depending on whether or not
// the user is requesting the corresponding flag.
function toggleRequesteeField(flagField, no_focus)
{
  // Convert the ID of the flag field into the ID of its corresponding
  // requestee field and then use the ID to get the field.
  var id = flagField.name.replace(/flag(_type)?-(\d+)/, "requestee$1-$2");
  var requesteeField = Y.one('#' + id);
  if (!requesteeField) return;

  // Show or hide the requestee field based on the value
  // of the flag field.
  if (flagField.value == "?") {
      requesteeField.ancestor().removeClass('bz_default_hidden');
      if (!no_focus) requesteeField.focus();
  } else
      requesteeField.ancestor().addClass('bz_default_hidden');
}

// Hides requestee fields when the window is loaded since they shouldn't
// be enabled until the user requests that flag type.
function hideRequesteeFields()
{
  var inputElements = Y.all("input");
  var selectElements = Y.all("select");
  
  //Concatenating the two Nodelist
  inputElements.concat(selectElements);
  var inputElement, id, flagField, inputElementsSize;
  inputElementsSize = inputElements.size();
  for ( var i=0 ; i<inputElementsSize ; i++ )
  {
    inputElement = inputElements.item(i);
    if (inputElement.get('name').search(/^requestee(_type)?-(\d+)$/) != -1)
    {
      // Convert the ID of the requestee field into the ID of its corresponding
      // flag field and then use the ID to get the field.
      id = inputElement.get('name').replace(/requestee(_type)?-(\d+)/, "flag$1-$2");
      flagField = document.getElementById(id);
      if (flagField && flagField.value != "?")
          inputElement.ancestor().addClass('bz_default_hidden');
    }
  }
}
Y.on('domready', hideRequesteeFields);
