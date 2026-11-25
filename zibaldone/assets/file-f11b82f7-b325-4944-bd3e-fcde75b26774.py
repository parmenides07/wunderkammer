
#!/usr/bin/env python3

import numpy
import math

# given input array of all data points, calculate euclidian distance amongst test point and each of the data points. Then sort the array of these data point objects by their distance value and chop off all indexes after value k. Then, iterate through them, taking their y value and multiplying by a weight (see below) and contributing that value to a running total. Add that weight to another total ewight and then divide the running total by the total weight.
# if classification sum the weights associated with each class and then select the class with the greatest toal weight


#okay lets assume our input is fed in as a matrix, meaning an array of data with each data instance in teh array being an array of x points and at the end a y point.

# normalize all x values in matrix
# iterate through matrix calculating the distnace dynamically and building the following strppeddata object and making an array of those strippedata objects and sorting that array by distance and chopping off all indexes past k.
# we are assuming collumns of matrix are hte different datasets with the first collumn being the test set and then rows are x1, x2,...xn and y
# CORRECTION: Each ROW is a data point. The first row is the test point.
# Each COLUMN is a feature (x1, x2,...xn), except the last column, which is y.


def WKNN(input, classification, k):

    DIVCONST = 0.000001 # this is to make sure no division by 0.

    # Make a copy so normalization does not modify the original data.
    input = [list(row) for row in input]

    if not 1 <= k <= len(input) - 1:
        raise ValueError("k must be between 1 and the number of training points")

    # Unsure if I need input.T (transpose) to convert collumns to rows and rows to collumns
    # CORRECTION: No transpose needed since each row is already a data point.

    # Minus 1 because the last row is the Y output.
    # CORRECTION: Minus 1 because the last COLUMN is the Y output.
    for y in range(len(input[0])-1): #iterating row by row NOT, the last row though
        # CORRECTION: Here y is actually the feature/column index.
        subinput = []

        # we are starting from 1 so as to disregard the test point from mean adn stdev
        for x in range(1, len(input)):
            # So we are adding all of the x1 or x2 or x3 inputs into the array
            subinput.append(float(input[x][y]))

        # okay so now we have an array of all instances of one type of input now we want to tkae the standard deviation and mean of the set so we can use them to do normalization
        stdev = numpy.std(subinput)
        mean = numpy.mean(subinput)

        # If the feature is constant, avoid division by zero.
        if stdev == 0:
            stdev = 1.0

        # now we replace each value with the normalized value
        for x in range(len(input)):
            input[x][y] = (float(input[x][y]) - mean)/stdev

    class StrippedData:
        def __init__(self, output, distance):
            self.output = output
            self.distance = distance

    simplifiedInput = []

    # we do not want to iterate for the first collumn because that is the test data
    # CORRECTION: Skip the first ROW, since that is the test point.
    for x in range(1, len(input)):
        distance = 0

        # iterating through rows to get each individual subinput (x, x1, etc) but we did -1 so last row (the output) is skipped
        # CORRECTION: Iterate through columns/features, excluding the final output column.
        for y in range(len(input[0])-1):
            # normal euclidian distance remember that first collumn is test data so we subtract other by test
            # CORRECTION: The first row is the test data.
            distance += math.pow(input[x][y] - input[0][y], 2)

        distance = math.sqrt(float(distance))

        simplifiedInput.append(StrippedData(input[x][-1], distance))

    simplifiedInput.sort(key=lambda x: x.distance)
    simplifiedInput = simplifiedInput[:k]

    if (classification is False):
        outputTotal = 0
        weightTotal = 0

        for i in simplifiedInput:
            # this is the weighting function
            weight = 1/(i.distance + DIVCONST)
            outputTotal += float(i.output) * weight
            weightTotal += weight

        return outputTotal/weightTotal

    if (classification is True):
        classes = {}

        # so im taking the weights and adding them to a hashmap indexed by the class so each class when it shows up will just get the weight of the data added to it. Almost like a weighted vote
        for i in simplifiedInput:
            weight = 1/(i.distance + DIVCONST)

            # This way it dosent fail if the class dosent exist yet since if you do += weight then it will try to edit without checking to see if the thing exists first, it wont insdtantiate it to be 0
            classes[i.output] = classes.get(i.output, 0) + weight

        # arr.keys is just the keys so the indexses
        # arr.values is just the values at each idnex
        # arr.items is both of them with the indexes being first and values being second
        winnerClasses = []
        winnerWeight = 0

        for classe, weight in classes.items():
            if (weight > winnerWeight):
                winnerClasses = [classe]
                winnerWeight = weight
            elif (weight == winnerWeight):
                winnerClasses.append(classe)

        return winnerClasses


data = [
    [ 1, 2, None],    
    [-1, 3, "Red"],
    [ 2, 1, "Blue"],
    [-2, 2, "Red"],
    [-1, 2, "Blue"],
    [-1, 0, "Blue"],
    [ 1, 1, "Red"]
]

print(WKNN(data, True, 1))
print(WKNN(data, True, 3))
