
import tensorflow as tf
import numpy as np
Pragathi_Model=tf.keras.models.load_model(r"C:\Users\surya\PycharmProjects\PythonProject1\PM (1).keras")
classes=["Mild Demented","Moderate Demented","Non Demented","Very Mild Demented"]
img=tf.keras.utils.load_img(
    r"C:\Users\surya\OneDrive\Documents\s1.png",
    target_size=(224,224)
)
imag_array=tf.keras.utils.img_to_array(img)
imag_array=np.expand_dims(imag_array,axis=0)
prediction=Pragathi_Model.predict(imag_array)
class_index=np.argmax(prediction[0])
print(classes[class_index])