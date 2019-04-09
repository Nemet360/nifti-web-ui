import sys
import math
import os
import json
import tempfile
from vtk import vtkImageThreshold, vtkNIFTIImageReader, vtkImageSliceMapper, vtkImageSlice, vtkSTLWriter, vtkDecimatePro, vtkSmoothPolyDataFilter, vtkDiscreteMarchingCubes, vtkMarchingCubes




def threshold_data(reader, value, min, max):
    threshold = vtkImageThreshold()
    threshold.SetInputConnection(reader.GetOutputPort())
    threshold.ThresholdByLower(value) #th
    threshold.ReplaceInOn()
    threshold.SetInValue(min) # set all values below th to 0
    threshold.ReplaceOutOn()
    threshold.SetOutValue(max) # set all values above th to 1
    threshold.Update()
    return threshold 



def image(file):
    reader = vtkNIFTIImageReader()
    reader.SetFileName(file)
    reader.Update()
    middle = 115
    min = 0 
    max = 255
    t = threshold(reader, 10, min, max)
    mapper = vtkImageSliceMapper()
    mapper.SliceAtFocalPointOn()
    mapper.SetInputConnection(t.GetOutputPort())
    actor = vtkImageSlice()
    actor.SetMapper(mapper)
    return actor



def stl(d,outfile):
    writer = vtkSTLWriter()
    writer.SetInputConnection(d.GetOutputPort())
    writer.SetFileName(outfile)   
    return writer.Write()



def reduce_mesh(d,factor):
    r = vtkDecimatePro()
    r.SetInputConnection(d.GetOutputPort())
    r.SetTargetReduction(factor) #?
    #r.PreserveTopologyOn()
    return r



def smooth_mesh(d,factor):
    s = vtkSmoothPolyDataFilter() ###
    s.SetInputConnection(d.GetOutputPort()) #!
    s.SetNumberOfIterations(factor)
    return s



#void vtkMarchingCubes::GenerateValues(int numContours, double rangeStart, double rangeEnd)
def discrete(reader, r):
    d = vtkDiscreteMarchingCubes()  
    d.SetInputConnection(reader.GetOutputPort())
    d.GenerateValues(1, r[0], r[1]) #1,1,10
    d.ComputeNormalsOn()
    d.Update()
    return d 



def to_int(v): 
    return int(round(v))



#vtk.vtkFlyingEdges3D() 
#vtk.vtkContourFilter()
def simple(reader, r):
    d = vtkMarchingCubes()
    d.SetInputConnection(reader.GetOutputPort())
    d.SetValue(r[0], r[1]) #0,50
    d.ComputeNormalsOn()
    d.Update()
    return d 



def brain_to_stdout(file, smooth, threshold, shouldThreshold, reductionFactor):
    
    reader = vtkNIFTIImageReader()
    reader.SetFileName(file)
    reader.Update()  

    e = reader.GetDataExtent()
    r = reader.GetOutput().GetScalarRange()
    r = [to_int(r[0]), to_int(r[1])]
    
    r[1] = r[1]/100

    min = 0
    max = 255
    n = 700000.0

    if shouldThreshold:
       t = threshold_data(reader, threshold, min, max)
       dmc = discrete(t,[min,max])
       before = float(dmc.GetOutput().GetNumberOfPolys()) #GetNumberOfPoints

       if(before>n):
          factor = 1 - (n / before) 
          dmc = reduce_mesh(dmc, factor)
          dmc.Update()

       after = dmc.GetOutput().GetNumberOfPolys()

    else:   
       dmc = discrete(reader,r)

    if smooth==0:
       sm = dmc 
    else:      
       sm = smooth_mesh(dmc, smooth)   

    outfile = os.path.join(tempfile.gettempdir(), "temp123321.stl") 

    stl(sm,outfile)
    
    with open(outfile, 'r') as content:
        data = content.read()
        print(data)

    os.remove(outfile)



def get_filename(args):
    return args[1] #1



def get_options(args):
    return args[2] #2



def main():
   options = get_options(sys.argv)
   options_parsed = json.loads(options)

   smooth = options_parsed["smooth"]
   threshold = options_parsed["threshold"] 
   shouldThreshold = options_parsed["shouldThreshold"] 
   reductionFactor = options_parsed["reductionFactor"]

   filename = get_filename(sys.argv)
   brain_to_stdout(filename, smooth, threshold, shouldThreshold, reductionFactor)
   '''
   filename = "./samples/w2.nii"
   brain_to_stdout(filename, 300, 50, True, 0.1)
   '''
   sys.exit(0)



main()