import sys
import math
import time
import os
import vtk
import json
import textwrap
import uuid 



def threshold_data(reader, value, min, max):
    threshold = vtk.vtkImageThreshold()
    threshold.SetInputConnection(reader.GetOutputPort())
    threshold.ThresholdByLower(value) #th
    threshold.ReplaceInOn()
    threshold.SetInValue(min) # set all values below th to 0
    threshold.ReplaceOutOn()
    threshold.SetOutValue(max) # set all values above th to 1
    threshold.Update()
    return threshold 



def image(file):
    reader = vtk.vtkNIFTIImageReader()
    reader.SetFileName(file)
    reader.Update()
    middle = 115
    min = 0 
    max = 255
    t = threshold(reader, 10, min, max)
    mapper = vtk.vtkImageSliceMapper()
    mapper.SliceAtFocalPointOn()
    mapper.SetInputConnection(t.GetOutputPort())
    actor = vtk.vtkImageSlice()
    actor.SetMapper(mapper)
    return actor



def stl(d,outfile):
    writer = vtk.vtkSTLWriter()
    writer.SetInputConnection(d.GetOutputPort())
    writer.SetFileName(outfile)   
    return writer.Write()



def reduce_mesh(d,factor):
    r = vtk.vtkDecimatePro()
    r.SetInputConnection(d.GetOutputPort())
    r.SetTargetReduction(factor) #?
    #r.PreserveTopologyOn()
    return r



def smooth_mesh(d,factor):
    s = vtk.vtkSmoothPolyDataFilter() ###
    s.SetInputConnection(d.GetOutputPort()) #!
    s.SetNumberOfIterations(factor)
    return s



#void vtkMarchingCubes::GenerateValues(int numContours, double rangeStart, double rangeEnd)
def discrete(reader, r):
    d = vtk.vtkDiscreteMarchingCubes()  
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
    d = vtk.vtkMarchingCubes()
    d.SetInputConnection(reader.GetOutputPort())
    d.SetValue(r[0], r[1]) #0,50
    d.ComputeNormalsOn()
    d.Update()
    return d 



def brain_to_stdout(file, smooth, threshold, shouldThreshold, reductionFactor):
    
    reader = vtk.vtkNIFTIImageReader()
    reader.SetFileName(file)
    reader.Update()  

    e = reader.GetDataExtent()
    r = reader.GetOutput().GetScalarRange()
    r = [to_int(r[0]), to_int(r[1])]
    
    r[1] = r[1]/100

    min = 0
    max = 255
    n = 700000

    if shouldThreshold:

       t = threshold_data(reader, threshold, min, max)
       dmc = discrete(t,[min,max])
       before = dmc.GetOutput().GetNumberOfPolys() #GetNumberOfPoints

       if(before>n):
          factor = 1 - (n / before) 
          dmc = reduce_mesh(dmc, factor)
          dmc.Update()

    else:   
       dmc = discrete(reader,r)

    if smooth==0:
        sm = dmc 
    else:      
        sm = smooth_mesh(dmc, smooth)   

    outfile = os.path.join(os.getcwd(), ''.join([str(uuid.uuid4()), ".stl"]) ) 

    stl(sm,outfile)

    try:
        with open(outfile, 'r') as content:
            data = content.read()
            print(data)
    except:
        print("")
        sys.exit(0)

    os.remove(outfile)


def get_filename(args):
    return args[1]



def get_options(args):
    return args[2]



def main():
    options = get_options(sys.argv)
    options_parsed = json.loads(options)

    smooth = options_parsed["smooth"]
    threshold = options_parsed["threshold"] 
    shouldThreshold = options_parsed["shouldThreshold"] 
    reductionFactor = options_parsed["reductionFactor"]
    
    filename = get_filename(sys.argv) #"./samples/wt1.nii"
    brain_to_stdout(filename, smooth, threshold, shouldThreshold, reductionFactor)
    sys.exit(0)



if __name__ == '__main__':
    try:
        main()
    except:
        print("")
        sys.exit(0)