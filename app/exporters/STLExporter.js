/**
 * @author kovacsv / http://kovacsv.hu/
 * @author mrdoob / http://mrdoob.com/
 * @author mudcube / http://mudcu.be/
 * @author Mugen87 / https://github.com/Mugen87
 *
 * Usage:
 *  var exporter = new THREE.STLExporter();
 *
 *  // second argument is a list of options
 *  var data = exporter.parse( mesh, { binary: true } );
 *
 */

THREE.STLExporter = function () {};

THREE.STLExporter.prototype = {

	constructor: THREE.STLExporter,

	parse: ( function () {

		var vector = new THREE.Vector3();
		var normalMatrixWorld = new THREE.Matrix3();

		return function parse( scene, write ) {

			var objects = [];
			var triangles = 0;
			var buf = '';
			
			var buffer = '';

			var thresh = 64000;
	
			var consume = function(data) {
				if(buffer.length<thresh){
					buffer+=data;
				}else{
					write(buffer);
					buffer='';
				}
			}

			scene.traverse( function ( object ) {

				if ( object.isMesh ) {

					var geometry = object.geometry;

					if ( geometry.isBufferGeometry ) {

						geometry = new THREE.Geometry().fromBufferGeometry( geometry );

					}

					if ( geometry.isGeometry ) {

						triangles += geometry.faces.length;

						objects.push( {

							geometry: geometry,
							matrixWorld: object.matrixWorld

						} );

					}

				}

			} );



			var output = '';

			//output += 'solid exported\n';
			consume('solid exported\n');

			for ( var i = 0, il = objects.length; i < il; i ++ ) {

				var object = objects[ i ];

				var vertices = object.geometry.vertices;
				var faces = object.geometry.faces;
				var matrixWorld = object.matrixWorld;

				normalMatrixWorld.getNormalMatrix( matrixWorld );

				for ( var j = 0, jl = faces.length; j < jl; j ++ ) {

					var face = faces[ j ];

					vector.copy( face.normal ).applyMatrix3( normalMatrixWorld ).normalize();

					
					//output += '\tfacet normal ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';
					//output += '\t\touter loop\n';
					consume('\tfacet normal ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n');
					consume('\t\touter loop\n');

					var indices = [ face.a, face.b, face.c ];

					for ( var k = 0; k < 3; k ++ ) {

						vector.copy( vertices[ indices[ k ] ] ).applyMatrix4( matrixWorld );

						//output += '\t\t\tvertex ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';
						consume('\t\t\tvertex ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n');
					}

					//output += '\t\tendloop\n';
					//output += '\tendfacet\n';
					consume('\t\tendloop\n');
					consume('\tendfacet\n');
				}

			}

			//output += 'endsolid exported\n';
			consume('endsolid exported\n');

			if(buffer.length>0){
				write(buffer);
				buffer = '';
			}
			//return output;

		};

	}() )

};