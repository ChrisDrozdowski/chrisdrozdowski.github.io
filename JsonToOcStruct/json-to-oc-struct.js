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
        verbose = (verbose || false),
        baseStName = 'MyStruct',
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
            parseScope(scope, baseStName);

            if (structs.length > 0) {
                oc = '';

                if (verbose && arrays) {
                    oc += '// Be sure to add this include because of Array member(s).\n#include <Array.h>\n\n';
                }

                // Have to reverse the array then remove duplicates prior to output to
                // try to output the structs in proper order.
                structs = structs.reverse();
                structs = removeDuplicates(structs);
                for (var i = 0; i < structs.length; i++)
                {
                    if (verbose && (structs.length - 1 === i))
                    {
                        oc += '// This is the main struct to pass to JSON.ReadString in Origin C.\n// You can rename it as you see fit.\n'
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

    // stName is a potential struct name that has to be passed
    // through to parseStruct to ensure proper struct naming.
    function parseScope(scope, stName) {
        if ('object' === typeof scope && null !== scope) {
            if (Array.isArray(scope)) { // Array.
                return parseArray(scope, stName);
            }
            else { // JSON object.
                return parseStruct(scope, stName);
             }
        }
        else { // Scalar.
            return ocType(scope);
        }
     }

    // stName is a potential struct name that has to be passed
    // through to parseStruct to ensure proper struct naming.
    function parseArray(scope, stName) {
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
            var varType = parseStruct(scope[0], stName);
            return 'Array<' + varType + '&>';
        }

        // JSON doesn't support arrays of arrays only array of objects.
        //if ('array' === currType && scope.length > 0) {
        //}

    }

    // stName is a struct name that has to be passed
    // in to ensure proper struct naming.
    function parseStruct(scope, stName) {
        var struct = '',
            current = -1,
            constructors = '',
            fullName = '';

        structs.push(struct);
        current = structs.length - 1;

        fullName = 'st' + stName;

        structs[current] = 'struct ' + fullName + ' {';
        if (verbose && !validName(fullName)) {
            structs[current] += '\t// Struct name is likely an invalid C indentifier.';
        }

        structs[current] += '\n'

        var varNames = Object.keys(scope);
        for (var i in varNames) {
            var varName = varNames[i];
            var varType = parseScope(scope[varName], varName);

            structs[current] += '\t' + varType + ' ';
            structs[current] += ' ' + varName + ';';

            if (verbose && !validName(varName)) {
                structs[current] += '\t// Member name is likely an invalid C indentifier.';
            }

            if (verbose && varType.indexOf('__int64') > -1) {
                structs[current] += '\t// Data type may be double.';
            }
            else if (verbose && varType.indexOf('int') > -1) {
                structs[current] += '\t// Data type may be __int64 or double.';
            }

            structs[current] += '\n';

            if ('Array' === varType.substring(0, 5)) {
                constructors += '\n\t\t' + varName + '.SetAsOwner(true);\n';
            }
        }

        if (constructors.length > 0)
        {
            structs[current] += '\t' + fullName + '()\n\t{' + constructors + '\t}\n';
        }

        structs[current] += '}\n';

        if (0 === current) {
            return;
        }

        return fullName;
    }

    function ocType(val) {
        if (null === val) {
            return 'invalid';
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

    function removeDuplicates(arr) {
        return arr.filter(function(value, index, self) {
            return index === self.indexOf(value);
        });
    }
}

if (typeof module != 'undefined')
{
    if (!module.parent) {
        process.stdin.on('data', function(buf)
        {
            var json = buf.toString('utf8');
            console.log(jsonToOcStruct(json).oc);
        })
    }
    else {
        module.exports = jsonToOcStruct;
    }
}
