# flake8: noqa

# import all models into this package
# if you have many models here with many references from one model to another this may
# raise a RecursionError
# to avoid this, import only the models that you directly need like:
# from from openapi_client.model.pet import Pet
# or import this package, but before doing it, use:
# import sys
# sys.setrecursionlimit(n)

from openapi_client.model.error import Error
from openapi_client.model.new_pet import NewPet
from openapi_client.model.pet import Pet
from openapi_client.model.pet_all_of import PetAllOf
