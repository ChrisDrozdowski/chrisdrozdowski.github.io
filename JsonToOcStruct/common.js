$(function()
{
	var emptyInputMsg = "Paste JSON here.";
	var emptyOutputMsg = "Struct will appear here.";
	var formattedEmptyInputMsg = '<span style="color: #777;">'+emptyInputMsg+'</span>';
	var formattedEmptyOutputMsg = '<span style="color: #777;">'+emptyOutputMsg+'</span>';
	var verbose = $( "#verbose" ).prop( "checked");

	$( "#verbose" ).change(function() {
		verbose = $(this).prop( "checked");
		if ($("#input").text() !== emptyInputMsg)
		{
			$('#input').keyup();
		}
	});

	// Hides placeholder text.
	$('#input').on('focus', function()
	{
		var val = $(this).text();
		if (!val)
		{
			$(this).html(formattedEmptyInputMsg);
			$('#output').html(formattedEmptyOutputMsg);
		}
		else if (val == emptyInputMsg)
			$(this).html("");
	});

	// Shows placeholder text.
	$('#input').on('blur', function()
	{
		var val = $(this).text();
		if (!val)
		{
			$(this).html(formattedEmptyInputMsg);
			$('#output').html(formattedEmptyOutputMsg);
		}
	}).blur();

	// Automatically do the conversion.
	$('#input').keyup(function()
	{
		var input = $(this).text();
		if (!input)
		{
			$('#output').html(formattedEmptyOutputMsg);
			return;
		}

		var output = jsonToOcStruct(input, verbose);

		if (output.error) {
			$('#output').html('<span class="clr-red">'+output.error+'</span>');
			var parsedError = output.error.match(/Unexpected token .+ in JSON at position (\d+)/);
			if(parsedError) {
				try { 
					var faultyIndex = parsedError.length == 2 && parsedError[1] && parseInt(parsedError[1]);
					faultyIndex && $('#output').html(constructJSONErrorHTML(output.error, faultyIndex, input));
				} catch(e) {}
			}
		}
		else
		{
			var finalOutput = output.oc;
			// Firefox can't copy newlines correctly if text is syntax highlighted.
			// So don't syntax highlight for FF. Hack :(
			if (navigator.userAgent.indexOf("Firefox") > -1) {
				$('#output').text(finalOutput);
			}
			else {
				var coloredOutput = hljs.highlight("cpp", finalOutput);
				$('#output').html(coloredOutput.value);
			}
		}
	});

	// Fill in sample JSON if the user wants to see an example.
	$('#sample1').click(function()
	{
		$('#input').text(stringify(sampleJson1)).keyup();
	});
	$('#sample2').click(function()
	{
		$('#input').text(stringify(sampleJson2)).keyup();
	});

});

function constructJSONErrorHTML(rawErrorMessage, errorIndex, json) {
	var errorHeading = '<p><span class="clr-red">'+ rawErrorMessage +'</span><p>';
	var markedPart = '<span class="json-go-faulty-char">' + json[errorIndex] + '</span>';
	var markedJsonString = [json.slice(0, errorIndex), markedPart, json.slice(errorIndex+1)].join('');
	var jsonStringLines = markedJsonString.split(/\n/);
	for(var i = 0; i < jsonStringLines.length; i++) {

		if(jsonStringLines[i].indexOf('<span class="json-go-faulty-char">') > -1)  // faulty line
			var wrappedLine = '<div class="faulty-line">' + jsonStringLines[i] + '</div>';
		else 
			var wrappedLine = '<div>' + jsonStringLines[i] + '</div>';

		jsonStringLines[i] = wrappedLine;
	}
	return (errorHeading + jsonStringLines.join(''));
}

// Stringifies JSON in the preferred manner.
function stringify(json)
{
	return JSON.stringify(json, null, "\t");
}

// From the PUG REST API.
var sampleJson1 = {
  "PropertyTable": {
    "Properties": [
      {
        "CID": 1,
        "MolecularFormula": "C9H17NO4",
        "MolecularWeight": 203.238,
        "InChIKey": "RDHQFKQIGNGIED-UHFFFAOYSA-N"
      },
      {
        "CID": 2,
        "MolecularFormula": "C9H18NO4+",
        "MolecularWeight": 204.246,
        "InChIKey": "RDHQFKQIGNGIED-UHFFFAOYSA-O"
      },
      {
        "CID": 3,
        "MolecularFormula": "C7H8O4",
        "MolecularWeight": 156.137,
        "InChIKey": "INCSWYKICIYAHB-UHFFFAOYSA-N"
      },
      {
        "CID": 4,
        "MolecularFormula": "C3H9NO",
        "MolecularWeight": 75.111,
        "InChIKey": "HXKKHQJGJAFBHI-UHFFFAOYSA-N"
      },
      {
        "CID": 5,
        "MolecularFormula": "C3H8NO5P",
        "MolecularWeight": 169.073,
        "InChIKey": "HIQNVODXENYOFK-UHFFFAOYSA-N"
      }
    ]
  }
};
