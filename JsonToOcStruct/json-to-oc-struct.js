/*! jsonToOcStruct 1.0.0
 *
 * Created by Chris Drozdowski (drozdowski.chris@gmail.com)
 *
 * Licensed under MIT. License info available in project repository
 * at https://github.com/chrisdrozdowski.
 *
 * Based on MIT-licensed project by Matt Holt (https://mholt.github.io/json-to-go/)
 */

function jsonToOcStruct(json, verbose)
{
    var oc = '',
        data,
        scope,
        structs = [],
        arrays = false,
        main = 'MyStruct',
        verbose = (verbose || false),

        // List of most keywords that cannot be used for identifiers. May not be complete.
        keywords = ['array','auto','bool','break','case','char','const','continue','default','do','double',
            'else','enum','extern','float','for','goto','if','int','long','register','return','short',
            'signed','sizeof','static','string','struct','switch','typedef','uint','union','unsigned',
            'vector','void','volatile','wchar_t','while'];

        try {
            if ('object' === typeof json) {
                data = json;
            }
            else {
                data = JSON.parse(json.replace(/\.0/g, '.1')); // Hack that forces floats to stay as floats.
            }

            scope = data;
            parseScope(scope);

            if (structs.length > 0) {
                oc = '';

                if (verbose && arrays) {
                    oc += '// Be sure to add this include because of Array member(s).\n#include <Array.h>\n\n';
                }

                if (verbose) {
                    oc += '// You can rename the structs but be thoughtful about it.\n\n';
                }

                for (var i = structs.length - 1; i >= 0; i--)
                {
                    if (verbose && 0 === i)
                    {
                        oc += '// This is the main struct to pass to JSON.ReadString in Origin C.\n'
                    }
                    oc += structs[i] + '\n';
                }
            }
        }
        catch (e) {
            return {
                oc: '',
                error: e.message
            };
        }

    return {oc: oc};

    function parseScope(scope) {
        if ('object' === typeof scope && null !== scope) {
            if (Array.isArray(scope)) { // Array.
                return parseArray(scope);
            }
            else { // JSON object.
                return parseStruct(scope);
             }
        }
        else { // Scalar.
            return ocType(scope);
        }
     }

    function parseArray(scope) {
        var scalarType;

        for (var i = 0; i < scope.length; i++) {
            var prevType,
                currType;

            currType = ocType(scope[i]);

            if ('struct' === currType) {
                break;
            }
            // JSON doesn't support arrays of arrays only array of objects.
            //else if ('array' === currType) {
                //break;
            //}
            else if ('invalid' === currType) {
                break;
            }

            if ('string' === currType) {
                scalarType = 'string';
                break;
            }

            if ('double' === currType) {
                scalarType = 'double';
                break;
            }

            // Prevent from reverting from an __int64 back to an int.
            if ('__int64' === currType) {
                scalarType = '__int64';
            }

            if ('__int64' !== scalarType) {
                scalarType = currType;
            }
        }

        if (scalarType) {
            return 'vector<' + scalarType + '>';
        }

        if ('struct' === currType && scope.length > 0) {
            arrays = true;
            var varType = parseStruct(scope[0]);
            return 'Array<' + varType + '&>';
        }

        // JSON doesn't support arrays of arrays only array of objects.
        //if ('array' === currType && scope.length > 0) {
        //}

    }

    function parseStruct(scope) {
        var struct = '',
            current = -1,
            constructors = '';

        structs.push(struct);
        current = structs.length - 1;

        if (0 === current) {
            structs[current] = 'struct st' + main +' {\n';
        }
        else
        {
            structs[current] = 'struct stChild_' + current + ' {\n';
        }

        var varNames = Object.keys(scope);
        for (var i in varNames) {
            var varName = varNames[i],
                varType = parseScope(scope[varName]),
                isNull = varType.indexOf('null') > -1;
            
            if (isNull) { // Comment out members whose value is null.
                varType = '//???';
            }

            structs[current] += '\t' + varType + ' ';
            structs[current] += ' ' + varName + ';';

            if (verbose && !validName(varName)) {
                structs[current] += '\t// Member name is likely invalid.';
            }

            if (verbose && isNull) { // Add comment about null value being ambiguous data type.
                structs[current] += '\t// Null value in JSON input is an ambiguous data type.';
            }

            if (verbose && varType.indexOf('__int64') > -1) {
                structs[current] += '\t// May be double.';
            }
            else if (verbose && varType.indexOf('int') > -1) {
                structs[current] += '\t// May be __int64 or double.';
            }

            structs[current] += '\n';

            if ('Array' === varType.substring(0, 5)) {
                constructors += '\n\t\t' + varName + '.SetAsOwner(true);\n';
            }
        }

        if (constructors.length > 0) {
            structs[current] += '\tst' + current + '()\n\t{' + constructors + '\t}\n';
        }

        structs[current] += '}\n';

        if (0 === current) {
            return;
        }

        return 'stChild_' + current;
    }

    function ocType(val) {
        if (null === val) {
            return 'null';
        }

        switch (typeof val) {
            case 'string':
                    return 'string';

            case 'number':
                if (0 === (val % 1)) {
                    if (val > -2147483648 && val < 2147483647) {
                        return 'int';
                    }
                    else {
                        return '__int64';
                    }
                }
                else {
                    return 'double';
                }

            case 'boolean':
                return 'bool';

            case 'object':
                if (Array.isArray(val)) {
                    return 'array';
                }
                else {
                    return 'struct';
                }

            default:
                return 'invalid';
        }
    }

    function validName(str) {
        if (false === /^[a-zA-Z_][a-zA-Z0-9_]{0,31}$/.test(str)) {
            return false;
        }
        else if (keywords.indexOf(str) > -1) {
            return false;
        }
        else {
            return true;
        }
    }
}

if (typeof module != 'undefined')
{
    if (!module.parent) {
        process.stdin.on('data', function(buf) {
            var json = buf.toString('utf8');
            console.log(jsonToOcStruct(json).oc);
        })
    }
    else {
        module.exports = jsonToOcStruct;
    }
}
